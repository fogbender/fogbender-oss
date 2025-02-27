import classNames from "classnames";
import { SelectSearch } from "fogbender-client/src/shared/ui/SelectSearch";
import React from "react";
import ClockLoader from "react-spinners/ClockLoader";

const options = [
  { id: "0", option: "Robots" },
  { id: "1", option: "Integrations" },
  { id: "2", option: "APIs" },
  { id: "3", option: "Libraries" },
  { id: "4", option: "Analytics" },
  { id: "5", option: "Additives" },
  { id: "6", option: "Machine Oil" },
  { id: "7", option: "Glowplugs" },
  { id: "8", option: "Gaskets" },
  { id: "9", option: "Other" },
];

const subOptions = [
  {
    id: "0",
    label: "Which robot are you having trouble with?",
    options: [
      { id: "00", option: "All" },
      { id: "01", option: "Drilling" },
      { id: "02", option: "Driving" },
      { id: "03", option: "Flying" },
    ],
  },
  {
    id: "1",
    label: "Which integration are you having trouble with?",
    options: [
      { id: "10", option: "John Deere" },
      { id: "11", option: "Caterpillar" },
      { id: "12", option: "BelAZ" },
    ],
  },
  {
    id: "2",
    label: "Which API are you having trouble with?",
    options: [
      { id: "20", option: "IRS" },
      { id: "21", option: "FTB" },
      { id: "22", option: "Chevron" },
    ],
  },
  {
    id: "3",
    label: "Which library are you having trouble with?",
    options: [
      { id: "30", option: "Bibliotheca Alexandrina" },
      { id: "31", option: "The British Library" },
      { id: "32", option: "Library of Parliament" },
      { id: "33", option: "Wren Library" },
    ],
  },
  {
    id: "4",
    label: "What sort of troubles with analytics are you seeing?",
    options: [
      { id: "40", option: "Where's my data?" },
      { id: "41", option: "Cohort analysis" },
    ],
  },
  {
    id: "5",
    label: "Which additive are you having trouble with?",
    options: [
      { id: "50", option: "Sentences ending in prepositions" },
      { id: "51", option: "Lead" },
      { id: "52", option: "Ethanol" },
      { id: "53", option: "Sugar" },
    ],
  },
  {
    id: "6",
    label: "Which machine oil are you having trouble with?",
    options: [
      { id: "60", option: "Triceratops" },
      { id: "61", option: "Scipionyx" },
      { id: "62", option: "Tyrannosaurid" },
      { id: "63", option: "Herrerasaurus" },
    ],
  },
  {
    id: "7",
    label: "Which glowplug are you having trouble with?",
    options: [
      { id: "70", option: "NKG" },
      { id: "71", option: "Motorcraft" },
      { id: "72", option: "Bosch" },
    ],
  },
  {
    id: "8",
    label: "Which gasket are you having trouble with?",
    options: [
      { id: "80", option: "Intake manifold" },
      { id: "81", option: "Head" },
    ],
  },
  {
    id: "9",
    label: "Which gasket are you having trouble with?",
    options: [{ id: "90", option: "Rocker carrier" }],
  },
];

export const SupportBefore = () => {
  const [searchTechnologies, setSearchTechnologies] = React.useState<string>();
  const [selectedTechnology, setSelectedTechnology] = React.useState<(typeof options)[number]>();
  const filteredOptions = React.useMemo(
    () => filterOptions(searchTechnologies, options),
    [searchTechnologies]
  );

  const selectedOption = React.useMemo(
    () => selectedTechnology && subOptions.find(x => x.id === selectedTechnology?.id),
    [selectedTechnology]
  );

  const [searchSubOptions, setSearchSubOptions] = React.useState<string>();
  const [state, setState] = React.useState<"form" | "loading" | "thank-you">("form");
  const [selectedSubTechnology, setSelectedSubTechnology] =
    React.useState<(typeof subOptions)[number]["options"][number]>();
  const filteredSubOptions = React.useMemo(
    () => filterOptions(searchSubOptions, selectedOption?.options ?? []),
    [searchSubOptions, selectedOption]
  );

  React.useEffect(() => {
    if (state === "loading") {
      window.setTimeout(() => {
        setState("thank-you");
      }, 3000);
    }
  }, [state]);

  const isSubmitDisabled = !selectedTechnology || !selectedSubTechnology;
  return (
    <div className="h-screen shadow md:m-24">
      <div
        className={classNames(
          "flex h-full justify-center bg-white",
          state === "loading" ? "visible" : "hidden"
        )}
      >
        <div className="mt-48 flex w-full justify-center">
          <ClockLoader size={250} />
        </div>
      </div>
      <div
        className={classNames(
          "h-full flex-col justify-center bg-white",
          state === "thank-you" ? "visible" : "hidden"
        )}
      >
        <div className="w-full pt-48 text-center text-3xl font-bold text-indigo-800">
          Thank you! We'll be in touch.
        </div>
      </div>
      <div
        className={classNames(
          "h-full flex-col justify-center bg-white",
          state === "form" ? "visible" : "hidden"
        )}
      >
        <div className="mt-4 px-4 pt-4 text-2xl font-bold text-indigo-800 sm:px-24 sm:pt-12 sm:text-4xl md:mt-24">
          We need to know a little about your project.
        </div>
        <div className="mt-4 px-4 text-indigo-800 sm:mt-10 sm:px-24">
          What can we help you with?
        </div>
        <div className="mt-4 px-4 text-indigo-800 sm:px-24">
          <SelectSearch
            comboboxButtonClassName="border border-gray-300 rounded"
            onClearInput={() => {
              setSelectedTechnology(undefined);
              setSelectedSubTechnology(undefined);
              setSearchSubOptions(undefined);
            }}
            searchInputPlaceholder="Select..."
            searchInputValue={searchTechnologies}
            setSearchInputValue={setSearchTechnologies}
            selectedOption={selectedTechnology}
            displayValue={x => x?.option}
            onChange={setSelectedTechnology}
            options={filteredOptions}
          />
        </div>
        {selectedOption && (
          <div className="mt-4 px-4 text-indigo-800 sm:mt-10 sm:px-24">
            <div className="flex w-full">
              <div className="flex-1">{selectedOption.label}</div>
              <div className="text-gray-400">Optional</div>
            </div>
            <div className="mt-4">
              <SelectSearch
                comboboxButtonClassName="border border-gray-300 rounded"
                onClearInput={() => {
                  setSelectedSubTechnology(undefined);
                }}
                searchInputPlaceholder="Select..."
                searchInputValue={searchSubOptions}
                setSearchInputValue={setSearchSubOptions}
                selectedOption={selectedSubTechnology}
                onChange={setSelectedSubTechnology}
                options={filteredSubOptions}
                displayValue={x => x?.option}
              />
            </div>
          </div>
        )}
        {selectedSubTechnology && (
          <div className="mt-4 px-4 text-indigo-800 sm:mt-10 sm:px-24">
            <div className="flex w-full">
              <div className="flex-1">Subject</div>
            </div>
            <div className="mt-2">
              <input
                className="w-full border border-gray-200 p-3"
                type="text"
                placeholder="What is your question about?"
              />
            </div>
            <div className="mt-4 flex w-full sm:mt-10">
              <div className="flex-1">Describe the issue</div>
            </div>
            <div className="mt-2">
              <textarea
                className="w-full border border-gray-200 p-3"
                placeholder="Describe the problem as much as possible..."
              />
            </div>
            <button
              disabled={isSubmitDisabled}
              type="button"
              className={classNames(
                "my-4 inline-block rounded-md bg-indigo-800 py-2 px-4 text-white sm:my-10",
                !isSubmitDisabled &&
                  "focus:shadow-outline-indigo cursor-pointer hover:bg-indigo-900 focus:outline-none",
                isSubmitDisabled && "bg-gray-600 text-gray-400"
              )}
              onClick={() => setState("loading")}
            >
              Send Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const filterOptions = <O extends { option: string }>(input: string | undefined, options: O[]) =>
  !input
    ? options
    : options.filter(option => option.option.toLowerCase().includes(input.toLowerCase()));
