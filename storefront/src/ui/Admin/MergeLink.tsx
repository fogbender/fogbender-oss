type MergeIntegration = {
  name: string;
  square_image: string;
};

export type MergeLink = {
  id: string;
  remote_id: string; // e.g. hub_id for HubSpot
  end_user_origin_id: string;
  status: string;
  integration: MergeIntegration;
};
