# Batch EC2

AWS CDKを使用したAWS Batchの定期実行インフラストラクチャー

## 概要

このプロジェクトは、AWS Batchを使用してFargateで大規模な処理を定期的に実行するためのインフラを提供します。

## アーキテクチャ

![AWS Architecture](architecture.drawio.png)

- **VPC**: プライベートサブネットとパブリックサブネットを含むVPC
- **ECR**: Dockerイメージを保存するためのリポジトリ
- **AWS Batch**: Fargateを使用した大規模処理の実行環境
- **EventBridge**: 毎日午前3時（日本時間）にBatchジョブを起動


## Dockerイメージのビルドとプッシュ

```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージのビルド
cd app
docker build -t batch-ec2-repository .

# タグ付け
docker tag batch-ec2-repository:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/batch-ec2-repository:latest

# プッシュ
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/batch-ec2-repository:latest
```
