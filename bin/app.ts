#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { EcrStack } from '../lib/ecr-stack';
import { BatchStack } from '../lib/batch-stack';
import { EventBridgeStack } from '../lib/eventbridge-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
};

const vpcStack = new VpcStack(app, 'BatchEc2VpcStack', {
  env,
  description: 'VPC stack for Batch EC2',
});

const ecrStack = new EcrStack(app, 'BatchEc2EcrStack', {
  env,
  description: 'ECR stack for Batch EC2',
});

const batchStack = new BatchStack(app, 'BatchEc2BatchStack', {
  env,
  vpc: vpcStack.vpc,
  repository: ecrStack.repository,
  description: 'Batch stack for Batch EC2',
});
batchStack.addDependency(vpcStack);
batchStack.addDependency(ecrStack);

const eventBridgeStack = new EventBridgeStack(app, 'BatchEc2EventBridgeStack', {
  env,
  jobQueue: batchStack.jobQueue,
  jobDefinition: batchStack.jobDefinition,
  description: 'EventBridge stack for Batch EC2',
});
eventBridgeStack.addDependency(batchStack);

app.synth();
