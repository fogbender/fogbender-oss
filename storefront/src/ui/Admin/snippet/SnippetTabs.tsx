import { Tab, TabList, TabPanel, TabPanels, Tabs, useTabsContext } from "@reach/tabs";
import { TabListWrapper, TabWrapper } from "fogbender-client/src/shared";
import React from "react";

const CustomTab: React.FC<{ index: number }> = ({ index, children }) => {
  const { selectedIndex } = useTabsContext();
  return (
    <Tab className="flex-1 md:flex-none">
      <TabWrapper selected={index === selectedIndex}>{children}</TabWrapper>
    </Tab>
  );
};

export const SnippetTabs: React.FC<{
  react: React.ReactNode;
  javascript: React.ReactNode;
  script: React.ReactNode;
  more: React.ReactNode;
}> = ({ react, javascript, script, more }) => {
  return (
    <Tabs>
      <TabList>
        <TabListWrapper>
          <CustomTab index={0}>React</CustomTab>
          <CustomTab index={1}>JavaScript</CustomTab>
          <CustomTab index={2}>Script Tag</CustomTab>
          <CustomTab index={3}>Advanced</CustomTab>
        </TabListWrapper>
      </TabList>
      <TabPanels>
        <TabPanel>{react}</TabPanel>
        <TabPanel>{javascript}</TabPanel>
        <TabPanel>{script}</TabPanel>
        <TabPanel>{more}</TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export const ServerSnippetTabs: React.FC<{
  jwt: React.ReactNode;
  fetch: React.ReactNode;
  fullstack: React.ReactNode;
  curl: React.ReactNode;
}> = ({ jwt, fetch, fullstack, curl }) => {
  return (
    <Tabs>
      <TabList>
        <TabListWrapper>
          <CustomTab index={0}>Node.js</CustomTab>
          <CustomTab index={1}>Node.js fetch</CustomTab>
          <CustomTab index={2}>curl</CustomTab>
          <CustomTab index={3}>Node.js fullstack</CustomTab>
        </TabListWrapper>
      </TabList>
      <TabPanels>
        <TabPanel>{jwt}</TabPanel>
        <TabPanel>{fetch}</TabPanel>
        <TabPanel>{curl}</TabPanel>
        <TabPanel>{fullstack}</TabPanel>
      </TabPanels>
    </Tabs>
  );
};
