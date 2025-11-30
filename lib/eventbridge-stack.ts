import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as batch from 'aws-cdk-lib/aws-batch';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface EventBridgeStackProps extends cdk.StackProps {
  jobQueue: batch.IJobQueue;
  jobDefinition: batch.EcsJobDefinition;
}

export class EventBridgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EventBridgeStackProps) {
    super(scope, id, props);

    const { jobQueue, jobDefinition } = props;

    const eventRole = new iam.Role(this, 'EventBridgeRole', {
      roleName: 'batch-ec2-eventbridge-role',
      assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
    });

    eventRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['batch:SubmitJob'],
      resources: [
        jobQueue.jobQueueArn,
        jobDefinition.jobDefinitionArn,
      ],
    }));

    const rule = new events.Rule(this, 'BatchScheduleRule', {
      ruleName: 'batch-ec2-schedule-rule',
      description: 'Schedule rule to trigger AWS Batch job',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '18',
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    rule.addTarget(new targets.BatchJob(
      jobQueue.jobQueueArn,
      jobQueue,
      jobDefinition.jobDefinitionArn,
      jobDefinition,
      {
        role: eventRole,
        jobName: 'batch-ec2-scheduled-job',
        attempts: 3,
      }
    ));

    new cdk.CfnOutput(this, 'EventRuleArn', {
      value: rule.ruleArn,
      description: 'EventBridge Rule ARN',
      exportName: 'batch-ec2-event-rule-arn',
    });
  }
}
