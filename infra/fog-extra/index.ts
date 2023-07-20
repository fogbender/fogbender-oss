import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { resourceName, resourceTags } from "../lib/utils";

const config = new pulumi.Config();
const s3LogBucket = config.require("s3LogBucket");


const s3FileUpload = new aws.s3.Bucket(resourceName("s3-file-upload"), {
  loggings: [
    {
      targetBucket: s3LogBucket,
      targetPrefix: resourceName("s3-file-upload/"),
    },
  ],
  versioning: {
    enabled: true,
  },
  tags: resourceTags()
});


export const fileUploadBucket = s3FileUpload.bucket;
export const fileUploadRegion = s3FileUpload.region;
