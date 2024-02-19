import classNames from "classnames";
import Picker from "emoji-picker-react";
import {
  FileCard,
  Icons,
  LinkButton,
  Modal,
  ThickButton,
  ThinButton,
} from "fogbender-client/src/shared";
import { Select } from "fogbender-client/src/shared/ui/Select";
import React from "react";
import { Title } from "reactjs-meta";

import logo from "../assets/logo.svg";

import { ExpandableSection } from "./Admin/ExpandableSection";
import { IntegrationUser } from "./Admin/Integrations/Utils";

export const ShowcaseAccordion: React.FC<{
  title: string;
  forceOpen?: boolean;
  children?: React.ReactNode;
}> = ({ title, forceOpen = false, children }) => {
  return (
    <ExpandableSection title={title} expand={forceOpen}>
      <div className="my-4 flex flex-col gap-y-4 gap-x-4">{children}</div>
    </ExpandableSection>
  );
};

export const ComponentsShowcase = () => {
  const textNames = [
    ["Header 1", "fog:text-header1"],
    ["Header 2", "fog:text-header2"],
    ["Header 3", "fog:text-header3"],
    undefined,
    ["Body L", "fog:text-body-l"],
    ["Body M", "fog:text-body-m"],
    ["Body S", "fog:text-body-s"],
    ["Body XS", "fog:text-body-xs"],
    undefined,
    ["Caption XL", "fog:text-caption-xl"],
    ["Caption L", "fog:text-caption-l"],
    ["Caption M", "fog:text-caption-m"],
    ["Caption S", "fog:text-caption-s"],
    ["Caption XS", "fog:text-caption-xs"],
    undefined,
    ["Button M", "fog:text-button-m"],
    ["Button S", "fog:text-button-s"],
    undefined,
    ["Chat Username M", "fog:text-chat-username-m"],
    ["Chat Username S", "fog:text-chat-username-s"],
  ];
  const [expandAll, toggleAll] = React.useReducer(expand => !expand, false);
  const [showModal, setShowModal] = React.useState(false);
  const [modalBlocks, setModalBlocks] = React.useState<string[]>([
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  ]);
  const [loadingThinM, setLoadingThinM] = React.useState(false);
  const [loadingThinS, setLoadingThinS] = React.useState(false);
  const [loadingThickM, setLoadingThickM] = React.useState(false);
  const [loadingThickS, setLoadingThickS] = React.useState(false);
  const [chips, setChips] = React.useState({ 0: true, 1: true, 2: true, 3: true });
  return (
    <div>
      <Title>Fogbender | Showcase</Title>
      <ThinButton onClick={toggleAll}>{expandAll ? "Collapse all" : "Expand all"}</ThinButton>

      <div className="mt-4 flex flex-col gap-4">
        <ShowcaseAccordion title="Typography" forceOpen={expandAll}>
          {textNames.map((name, i) =>
            name === undefined ? (
              <Hr key={i} />
            ) : (
              <div key={i} className="mb-8 flex items-center">
                <div className="flex-1">{name[0]}</div>
                <div className="flex-2">
                  <h1 className={name[1]}>{name[0]}</h1>
                </div>
              </div>
            )
          )}
        </ShowcaseAccordion>

        <ShowcaseAccordion title="ThinButton" forceOpen={expandAll}>
          <div className="flex gap-x-4">
            <div className="flex items-start">
              <ThinButton colorClassName="fog:text-link fog:box-link">Blue button M</ThinButton>
            </div>
            <div className="flex items-start">
              <ThinButton>Ghost button M</ThinButton>
            </div>
            <div className="flex items-start">
              <ThinButton disabled={true}>Disabled button M</ThinButton>
            </div>
            <div className="flex items-start">
              <ThinButton loading={loadingThinM} onClick={() => setLoadingThinM(x => !x)}>
                Button M loading
              </ThinButton>
              {loadingThinM && (
                <ThinButton className="mx-1" onClick={() => setLoadingThinM(false)}>
                  Stop M
                </ThinButton>
              )}
            </div>
          </div>
          <div className="flex gap-x-4">
            <div className="flex items-start">
              <ThinButton small={true} colorClassName="fog:text-link fog:box-link">
                Blue button S
              </ThinButton>
            </div>
            <div className="flex items-start">
              <ThinButton small={true}>Ghost button S</ThinButton>
            </div>
            <div className="flex items-start">
              <ThinButton small={true} disabled={true}>
                Disabled button S
              </ThinButton>
            </div>
            <div className="flex items-start">
              <ThinButton
                small={true}
                loading={loadingThinS}
                onClick={() => setLoadingThinS(x => !x)}
              >
                Button S loading
              </ThinButton>
              {loadingThinS && (
                <ThinButton small={true} className="mx-1" onClick={() => setLoadingThinS(false)}>
                  Stop S
                </ThinButton>
              )}
            </div>
          </div>
        </ShowcaseAccordion>
        <ShowcaseAccordion title="ThickButton" forceOpen={expandAll}>
          <div className="flex gap-x-4">
            <div>
              <ThickButton>Basic button M</ThickButton>
            </div>
            <div>
              <ThickButton disabled={true}>Disabled button M</ThickButton>
            </div>
            <ThickButton loading={loadingThickM} onClick={() => setLoadingThickM(x => !x)}>
              Button M Loading
            </ThickButton>
            {loadingThickM && (
              <ThickButton onClick={() => setLoadingThickM(false)}>Stop M</ThickButton>
            )}
          </div>
          <div className="flex gap-x-4">
            <div>
              <ThickButton small={true}>Basic button S</ThickButton>
            </div>
            <div>
              <ThickButton small={true} disabled={true}>
                Disabled button S
              </ThickButton>
            </div>
            <ThickButton
              small={true}
              loading={loadingThickS}
              onClick={() => setLoadingThickS(x => !x)}
            >
              Button S Loading
            </ThickButton>
            {loadingThickS && (
              <ThickButton small={true} onClick={() => setLoadingThickS(false)}>
                Stop S
              </ThickButton>
            )}
          </div>
        </ShowcaseAccordion>

        <ShowcaseAccordion title="Buttons alignment" forceOpen={expandAll}>
          <div className="mr-auto bg-yellow-100">
            <p className="my-4">This box is responsive</p>
            <div className="flex flex-col flex-wrap gap-y-4 md:flex-row md:gap-x-4">
              <LinkButton position="start">Start link button</LinkButton>
              <ThickButton>OK</ThickButton>
              <LinkButton>Link button</LinkButton>
              <ThickButton>OK</ThickButton>
              <LinkButton position="end">End link button</LinkButton>
            </div>
          </div>
        </ShowcaseAccordion>

        <ShowcaseAccordion title="Select dropdowns" forceOpen={expandAll}>
          <SelectsList />
        </ShowcaseAccordion>

        <ShowcaseAccordion title="Modals" forceOpen={expandAll}>
          <div>
            <ThinButton onClick={() => setShowModal(true)}>Open Modal</ThinButton>
          </div>
          {showModal && (
            <Modal
              onClose={() => {
                setShowModal(false);
              }}
            >
              <div>
                <h1 className="fog:text-header2 mb-4">Sample modal</h1>
                {modalBlocks.map((x, i) => (
                  <p key={i} className="mb-2">
                    {x}
                  </p>
                ))}
                <p>
                  <ThinButton onClick={() => setModalBlocks(blocks => blocks.concat(blocks[0]))}>
                    Add more text
                  </ThinButton>
                </p>
              </div>
            </Modal>
          )}
        </ShowcaseAccordion>
        <ShowcaseAccordion title="Icons" forceOpen={expandAll}>
          <IconsList />
        </ShowcaseAccordion>

        <ShowcaseAccordion title="Emoji Picker" forceOpen={expandAll}>
          <EmojiPickerStandalone />
        </ShowcaseAccordion>

        <ShowcaseAccordion title="Toolbar menu" forceOpen={expandAll}>
          <div>
            <ToolBarMenu />
          </div>
        </ShowcaseAccordion>

        <ShowcaseAccordion title="FileCard" forceOpen={expandAll}>
          <div className="flex flex-row flex-wrap gap-x-4">
            {chips[0] && <FileCard className="px-2 py-3">Long_long_file_name.pdf</FileCard>}
            {chips[1] && (
              <FileCard
                className="px-2 py-3"
                loading={true}
                onTrash={() => setChips({ ...chips, 1: false })}
              >
                Long_long_file_name.pdf
              </FileCard>
            )}
            {chips[2] && (
              <FileCard className="px-2 py-3" onTrash={() => setChips({ ...chips, 2: false })}>
                Long_long_file_name.pdf
              </FileCard>
            )}
            {chips[3] && (
              <FileCard
                className="px-2 py-3"
                onTrash={() => setChips({ ...chips, 3: false })}
                error={
                  <div>
                    Upload
                    <br />
                    Failed
                  </div>
                }
              >
                Long_long_file_name.pdf
              </FileCard>
            )}
          </div>
          <div className="flex flex-row flex-wrap gap-x-4">
            {chips[0] && (
              <FileCard className="px-2 py-3">
                <img className="h-12" src={logo.src} alt="" />
              </FileCard>
            )}
            {chips[1] && (
              <FileCard
                className="px-2 py-3"
                loading={true}
                onTrash={() => setChips({ ...chips, 1: false })}
              >
                <img className="h-12" src={logo.src} alt="" />
              </FileCard>
            )}
            {chips[2] && (
              <FileCard className="px-2 py-3" onTrash={() => setChips({ ...chips, 2: false })}>
                <img className="h-12" src={logo.src} alt="" />
              </FileCard>
            )}
            {chips[3] && (
              <FileCard
                className="px-2 py-3"
                onTrash={() => setChips({ ...chips, 3: false })}
                error={
                  <div>
                    Upload
                    <br />
                    Failed
                  </div>
                }
              >
                <img className="h-12" src={logo.src} alt="" />
              </FileCard>
            )}
          </div>
          <div>
            <ThinButton
              className={classNames(
                !chips[2] || !chips[3] ? "h-auto opacity-100" : "h-0 opacity-0",
                "transition-all"
              )}
              onClick={() => setChips({ ...chips, 1: true, 2: true, 3: true })}
            >
              Reset
            </ThinButton>
          </div>
        </ShowcaseAccordion>
        <ShowcaseAccordion title="Integration User" forceOpen={expandAll}>
          <div>
            <IntegrationUser
              userInfo={{
                email: "fogbendertestbot@height.app",
                pictureUrl: "https://storage.googleapis.com/height-files/fogbender.png",
                username: "Fogbender Test",
              }}
            />
          </div>
        </ShowcaseAccordion>
        <ShowcaseAccordion title="Notification sound" forceOpen={expandAll}>
          <NotificationSound />
        </ShowcaseAccordion>
      </div>
    </div>
  );
};

const Hr = () => <div className="my-8 h-0 border-b border-gray-300" />;

const SelectsList = () => {
  const options = [
    { id: "1", option: "Option 1" },
    { id: "2", option: "Option 2" },
    { id: "3", option: "Option 3" },
  ];
  const htmlOptions = [
    {
      id: "1",
      option: (
        <div className="flex items-center gap-x-1">
          <Icons.Gear />
          <span>Option 1</span>
        </div>
      ),
      optionTitle: "Option 1",
    },
    {
      id: "2",
      option: (
        <div className="flex items-center gap-x-1">
          <Icons.Gear />
          <span>Option 2</span>
        </div>
      ),
      optionTitle: "Option 2",
    },
    {
      id: "3",
      option: (
        <div className="flex items-center gap-x-1">
          <Icons.Gear />
          <span>Option 3</span>
        </div>
      ),
      optionTitle: "Option 3",
    },
  ];
  const [option1, setOption1] = React.useState<(typeof options)[0]>();
  const [option2, setOption2] = React.useState<(typeof options)[0]>();
  const [option3, setOption3] = React.useState<(typeof options)[0]>();
  const [option4, setOption4] = React.useState<(typeof options)[0]>();
  const [option5, setOption5] = React.useState<Omit<(typeof htmlOptions)[number], "optionTitle">>();
  const [option6, setOption6] = React.useState<(typeof htmlOptions)[number]>();
  return (
    <>
      <div className="flex gap-x-4">
        <div className="w-60">
          <Select
            options={options}
            selectedOption={option1}
            onChange={x => setOption1(x)}
            variant="large"
            title="Dropdown"
          />
        </div>

        <div className="w-60">
          <div className="mb-2">
            <Select
              options={options}
              selectedOption={option2}
              onChange={x => setOption2(x)}
              title="Dropdown"
            />
          </div>
          <Select
            options={options}
            selectedOption={option2}
            onChange={x => setOption2(x)}
            title="Dropdown"
          />
        </div>
      </div>
      <div className="flex gap-x-4">
        <div className="w-60">
          <Select
            options={options}
            selectedOption={undefined}
            title="Disabled dropdown"
            variant="large"
            disabled={true}
          />
        </div>
        <div className="w-60">
          <Select
            options={options}
            selectedOption={undefined}
            title="Disabled dropdown"
            disabled={true}
          />
        </div>
      </div>
      <div className="flex gap-x-4">
        <div className="w-60">
          <Select
            options={options}
            selectedOption={option3}
            onChange={x => setOption3(x)}
            variant="large"
            title="Large dropdown with unbelievable long title name and really short options"
          />
        </div>
        <div className="w-60">
          <Select
            options={options}
            selectedOption={option4}
            onChange={x => setOption4(x)}
            title="Dropdown with unbelievable long title name and really short options"
          />
        </div>
      </div>
      <div className="flex gap-x-4">
        <div className="w-60">
          <Select
            options={htmlOptions.map(x => ({ id: x.id, option: x.option }))}
            selectedOption={option5}
            onChange={x => setOption5(x)}
            variant="large"
            title="Html options"
          />
        </div>
        <div className="w-60">
          <Select
            options={htmlOptions}
            selectedOption={option6}
            onChange={x => setOption6(x)}
            variant="large"
            title="Html options and text value"
          />
        </div>
      </div>
    </>
  );
};

const IconsList = () => {
  return (
    <div className="flex flex-col items-start justify-start gap-y-8">
      {Object.entries(Icons)
        .sort(([name1], [name2]) => (name1 > name2 ? 1 : name1 < name2 ? -1 : 0))
        .map(([iconName, Icon]) => (
          <div key={iconName} className="flex items-center justify-center gap-x-4">
            <div className="fog:text-body-xs w-24">{iconName}</div>
            <div className="text-brand-orange-500 flex w-16 items-center justify-center">
              <Icon />
            </div>
            <div className="flex w-16 cursor-not-allowed items-center justify-center text-gray-300">
              <Icon className="w-4" />
            </div>
            <div className="hover:text-brand-red-500 flex w-16 cursor-pointer items-center justify-center text-black">
              <Icon className="w-4" />
            </div>
            <div className="flex w-16 cursor-pointer items-center justify-center text-gray-500 hover:text-gray-800">
              <Icon className="w-8" />
            </div>
          </div>
        ))}
    </div>
  );
};

const EmojiPickerStandalone = () => {
  const [showEmojiSelect, setShowEmojiSelect] = React.useState(false);
  const [emoji, setEmoji] = React.useState("🫥");
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  return (
    <div>
      <p className="fog:text-body-s mb-2">Click to show Emoji Picker</p>
      <div
        className={classNames(
          "relative inline-flex cursor-pointer items-center justify-center rounded-lg border bg-white p-2 text-8xl",
          showEmojiSelect ? "border-blue-500" : "border-gray-300 hover:border-gray-500"
        )}
        onClick={() => setShowEmojiSelect(x => !x)}
      >
        {emoji}
        {showEmojiSelect && (
          <div ref={emojiPickerRef} className="absolute left-0 bottom-full z-10 mb-1">
            <Picker
              searchDisabled={true}
              onEmojiClick={(emoji, e) => {
                e.stopPropagation();
                setEmoji(emoji.emoji);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ToolBarMenu = () => {
  const [showMenu, setShowMenu] = React.useState(false);
  return (
    <>
      <div
        onClick={() => {
          setShowMenu(x => !x);
        }}
        className="cursor-pointer"
      >
        <Icons.Menu className="w-4" />
      </div>
      {showMenu && (
        <div className="relative">
          <div className="fog:box-shadow-m fog:text-body-m absolute bottom-10 left-0 flex flex-col rounded bg-white py-2">
            <button className="flex gap-x-2 px-4 py-2 text-left hover:bg-gray-100">
              <Icons.Pin className="w-5" />
              Unpin message
            </button>
            <button className="px-4 py-2 text-left hover:bg-gray-100">Show edit history</button>
            <button className="px-4 py-2 text-left hover:bg-gray-100">
              Mark as unread and close room
            </button>
            <button className="px-4 py-2 text-left hover:bg-gray-100">Forward to...</button>
            <button className="px-4 py-2 text-left hover:bg-gray-100">File Issue...</button>
          </div>
        </div>
      )}
    </>
  );
};

const NotificationSound = () => {
  return (
    <div className="flex flex-col gap-y-4">
      <div
        className="flex gap-x-4"
        onMouseOver={e => {
          e.preventDefault();
          const audio = new Audio("/messenger-notification.wav");
          audio.playbackRate = 2;
          // tslint:disable-next-line:no-console
          console.log("Sound notification start time", Date.now());
          audio.onended = () => {
            // tslint:disable-next-line:no-console
            console.log("Sound notification end time", Date.now());
          };
          (async function playSound() {
            try {
              await audio.play();
            } catch (err) {
              console.error("sound notification error", err);
            }
          })();
        }}
      >
        Hover me to have some fun
      </div>
    </div>
  );
};
