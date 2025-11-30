import * as cdk from 'aws-cdk-lib';
import * as batch from 'aws-cdk-lib/aws-batch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface BatchStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  repository: ecr.IRepository;
}

export class BatchStack extends cdk.Stack {
  public readonly jobQueue: batch.IJobQueue;
  public readonly jobDefinition: batch.EcsJobDefinition;

  constructor(scope: Construct, id: string, props: BatchStackProps) {
    super(scope, id, props);

    const { vpc, repository } = props;

    const batchSecurityGroup = new ec2.SecurityGroup(this, 'BatchSecurityGroup', {
      vpc,
      securityGroupName: 'batch-ec2-security-group',
      description: 'Security group for AWS Batch',
      allowAllOutbound: true,
    });

    const executionRole = new iam.Role(this, 'BatchExecutionRole', {
      roleName: 'batch-ec2-execution-role',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    const taskRole = new iam.Role(this, 'BatchTaskRole', {
      roleName: 'batch-ec2-task-role',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:ListBucket',
      ],
      resources: ['*'],
    }));

    const computeEnvironment = new batch.FargateComputeEnvironment(this, 'BatchComputeEnvironment', {
      computeEnvironmentName: 'batch-ec2-compute-env',
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [batchSecurityGroup],
      maxvCpus: 256,
    });

    this.jobQueue = new batch.JobQueue(this, 'BatchJobQueue', {
      jobQueueName: 'batch-ec2-job-queue',
      priority: 1,
      computeEnvironments: [
        {
          computeEnvironment,
          order: 1,
        },
      ],
    });

    this.jobDefinition = new batch.EcsJobDefinition(this, 'BatchJobDefinition', {
      jobDefinitionName: 'batch-ec2-job-definition',
      container: new batch.EcsFargateContainerDefinition(this, 'BatchContainer', {
        image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
        memory: cdk.Size.mebibytes(2048),
        cpu: 1,
        executionRole,
        jobRole: taskRole,
        environment: {
          ENV: 'production',
        },
      }),
      retryAttempts: 3,
      timeout: cdk.Duration.hours(2),
    });

    new cdk.CfnOutput(this, 'JobQueueArn', {
      value: this.jobQueue.jobQueueArn,
      description: 'Batch Job Queue ARN',
      exportName: 'batch-ec2-job-queue-arn',
    });

    new cdk.CfnOutput(this, 'JobDefinitionArn', {
      value: this.jobDefinition.jobDefinitionArn,
      description: 'Batch Job Definition ARN',
      exportName: 'batch-ec2-job-definition-arn',
    });
  }
}
