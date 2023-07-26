import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export const resourceName = (name: string) => {
  const project = pulumi.getProject();
  const stack = pulumi.getStack();
  return `${project}-${stack}-${name}`;
};

export const resourceTags = (name?: string) => {
  return {
    "user:Project": pulumi.getProject(),
    "user:Stack": pulumi.getStack(),
    "Name": resourceName(name || "resource")
  };
};

export const assumeRolePolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: { Service: "ec2.amazonaws.com" },
      Action: "sts:AssumeRole",
    },
  ],
});

export const cloudWatchPolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Action: [
        "logs:PutLogEvents",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DescribeLogStreams",
        "logs:DescribeLogGroups",
        "logs:PutRetentionPolicy",
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets",
        "xray:GetSamplingStatisticSummaries",
        "ssm:GetParameters",
      ],
      Resource: "*",
    },
  ],
});

// StackReferences cache
let stackRefCache = new Map<string, pulumi.StackReference>();

export function stackRef(stack: string) {
  if (stackRefCache.has(stack)) {
    return stackRefCache.get(stack);
  } else {
    let ref = new pulumi.StackReference(stack);
    stackRefCache.set(stack, ref);
    return ref;
  }
}

export const addPeerRoute = (name, subnetId, cidrBlock, peerConn) => {
  const routeTable = aws.ec2.getRouteTableOutput({ subnetId: subnetId });
  new aws.ec2.Route(resourceName(name), {
    routeTableId: routeTable.id,
    destinationCidrBlock: cidrBlock,
    vpcPeeringConnectionId: peerConn.id,
  });
};

export const vpcFlowLog = (env, vpcId) => {
  const logGroup = new aws.cloudwatch.LogGroup(resourceName("log-group"), {
    name: `${env}/vpc-flow`,
    retentionInDays: 60,
  });
  const assumeRole = aws.iam.getPolicyDocument({
    statements: [
      {
        effect: "Allow",
        principals: [
          {
            type: "Service",
            identifiers: ["vpc-flow-logs.amazonaws.com"],
          },
        ],
        actions: ["sts:AssumeRole"],
      },
    ],
  });
  const role = new aws.iam.Role(resourceName("vpc-flow-log-role"), {
    assumeRolePolicy: assumeRole.then(assumeRole => assumeRole.json),
  });
  const flowLog = new aws.ec2.FlowLog(resourceName("vpc-flow-log"), {
    iamRoleArn: role.arn,
    logDestination: logGroup.arn,
    trafficType: "ALL",
    vpcId: vpcId,
  });
  const policyDocument = aws.iam.getPolicyDocument({
    statements: [
      {
        effect: "Allow",
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
        ],
        resources: ["*"],
      },
    ],
  });
  new aws.iam.RolePolicy(resourceName("vpc-flow-log-role-policy"), {
    role: role.id,
    policy: policyDocument.then(policyDocument => policyDocument.json),
  });
  return flowLog;
};
