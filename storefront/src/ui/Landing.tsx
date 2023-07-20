import classNames from "classnames";
import React from "react";
import { InlineWidget } from "react-calendly";
import ReactTooltipOriginal from "react-tooltip";
// @ts-ignore
import TypeAnimation from "react-type-animation";

import Nick from "../assets/nick-mehta.jpg";
import TeamAgata from "../assets/team-agata.png";
import TeamAndrei from "../assets/team-andrei.png";
import TeamAndrey from "../assets/team-andrey.png";
import TeamAndy from "../assets/team-andy.png";
import TeamAzikiwe from "../assets/team-azikiwe.png";
import TeamBen from "../assets/team-ben.png";
import TeamLuke from "../assets/team-luke.png";
import TeamBrezina from "../assets/team-matt-brezina.png";
import TeamMikl from "../assets/team-mikl.png";
import TeamNiral from "../assets/team-niral.png";
import TeamShawn from "../assets/team-shawn.png";
import TeamYaroslav from "../assets/team-yaroslav.png";
import UserDefault from "../assets/userdefault.svg";
import UserMask from "../assets/usermask.svg";
import TeamYc from "../assets/yc.png";
import ZigZagDark from "../assets/zigzag-dark.svg";
import ZigZagSmallGray from "../assets/zigzag-small-gray.svg";
import ZigZagSmall from "../assets/zigzag-small.svg";
import ZigZagWhite from "../assets/zigzag-white.svg";
import { getVersion, submitEmailUrl } from "../config";
import { FontAwesomeArrowRight } from "../shared/font-awesome/ArrowRight";
import { FontAwesomeBars } from "../shared/font-awesome/Bars";
import { LocalStorageKeys } from "../shared/LocalStorageKeys";
import { SafeLocalStorage } from "../shared/SafeLocalStorage";

import { useServerApiGet } from "./useServerApi";

const typingWords = ["Design", "Product", "Sales", "Support", "Engineering", "Marketing"];

function fixType(src: ImageMetadata | string) {
  return typeof src === "string" ? src : src.src;
}

export const Landing = () => {
  type MessageState = "initial" | "pending" | "success" | "failure";
  const [messageState, setMessageState] = React.useState<MessageState>("initial");

  const [showVersion, setShowVersion] = React.useState(false);
  const version = getVersion();
  const [, versionError, versionData] = useServerApiGet<{ version: string }>(
    showVersion ? `/public/about` : undefined
  );

  const onSubscribeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    setMessageState("pending");
    fetch(submitEmailUrl(), {
      method: "POST",
      body: JSON.stringify({ email: data.get("email") }),
    }).then(
      res => {
        if (res.status === 200) {
          setMessageState("success");
          return;
        }
        setMessageState("failure");
      },
      err => {
        console.error("failed to send email", err);
        setMessageState("failure");
      }
    );
  };

  const [navExpanded, setNavExpanded] = React.useState(false);
  const [faqExpandAll, setFaqExpandAll] = React.useState<boolean>();

  React.useEffect(() => {
    const className = "rem-is-15px";
    document.querySelector("html")?.classList.add(className);
    return () => {
      document.querySelector("html")?.classList.remove(className);
    };
  }, []);

  // shuffle same words once on start
  const typingWords1 = React.useMemo(
    () => [
      ...typingWords
        .sort(() => Math.random() - 0.5)
        .map(x => [x, 3000])
        .reduce((a, b) => a.concat(b), []),
    ],
    []
  );
  const typingWords2 = React.useMemo(
    () => [
      ...typingWords
        .sort(() => Math.random() - 0.5)
        .map(x => [x, 3000])
        .reduce((a, b) => a.concat(b), []),
      1500,
    ],
    []
  );

  const benefits = [
    "reduce churn",
    "eliminate duplicate issues",
    "decrease time-to-resolution",
    "reduce support costs",
    "foster communities",
    "increase revenue",
  ];

  const [benefitIdx, setBenefitIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setBenefitIdx(x => (x + 1) % benefits.length), 5000);
    return () => clearTimeout(t);
  }, [benefits.length, benefitIdx]);

  const [activateCalendly, setActivateCalendly] = React.useState(false);
  React.useEffect(() => {
    if (
      // we know that they are going for a demo
      window.location.hash === "#book-a-demo" ||
      // could be some kind of IE or something, prevents runtime crash
      typeof IntersectionObserver !== "function"
    ) {
      setActivateCalendly(true);
    }
  }, []);
  const calendlyRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (calendlyRef.current && !activateCalendly) {
      const observer = new IntersectionObserver(
        ([entry]) => entry.isIntersecting && setActivateCalendly(true)
      );
      observer.observe(calendlyRef.current);
      // Remove the observer as soon as the component is unmounted
      return () => {
        observer.disconnect();
      };
    }
    return;
  }, [activateCalendly]);

  const InlineWidgetActivated = React.useMemo(
    () =>
      activateCalendly ? (
        <InlineWidget
          pageSettings={{ hideLandingPageDetails: false, hideEventTypeDetails: false }}
          styles={{
            position: "relative",
            width: "100%",
            marginTop: "1rem",
            marginBottom: "1rem",
          }}
          url="https://calendly.com/andrei/fogbender-vendor-demo"
        />
      ) : (
        <div className="calendly-inline-widget py-12 text-center px-2">
          Oops, failed to load the calendar widget. Please{" "}
          <a href="https://calendly.com/andrei/fogbender-vendor-demo">click here</a> to book a demo.
        </div>
      ),
    [activateCalendly]
  );

  const [activateVimeo, setActivateVimeo] = React.useState(false);
  const vimeoRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (vimeoRef.current && !activateVimeo) {
      // could be some kind of IE or something, prevents runtime crash
      const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent);
      if (typeof IntersectionObserver !== "function" || isBot) {
        return setActivateVimeo(true);
      }
      const observer = new IntersectionObserver(
        ([entry]) => entry.isIntersecting && setActivateVimeo(true)
      );
      observer.observe(vimeoRef.current);
      // Remove the observer as soon as the component is unmounted
      return () => {
        observer.disconnect();
      };
    }
    return;
  }, [activateVimeo]);

  React.useEffect(() => {
    const el = document.querySelector("html");
    if (el) {
      el.classList.add("scroll-smooth");
      return () => {
        el.classList.remove("scroll-smooth");
      };
    }
    return;
  }, []);

  const [hadLogin, setHadLogin] = React.useState(false);
  React.useEffect(() => {
    if (SafeLocalStorage.getItem(LocalStorageKeys.HadLogin)) {
      setHadLogin(true);
    }
  }, []);
  const getStartedUrl = hadLogin ? "/admin" : "/signup";
  const signInOrUp = hadLogin ? "Sign in" : "Sign up";

  return (
    <div
      className={classNames(
        /* make sure to remove that font from tailwind.config and tailwind.css */
        "font-landing relative",
        navExpanded ? "overflow-x-hidden" : "overflow-x-auto"
      )}
    >
      <div
        className={classNames(
          "absolute z-10 h-full w-full transform overflow-y-scroll bg-white p-4 transition",
          !navExpanded && "-translate-x-full"
        )}
      >
        <div className="flex items-center">
          <div className="relative my-4 flex-shrink-0 self-start bg-cover bg-no-repeat">
            <Logo width="36" height="43" />
          </div>
          <div className="flex flex-1 cursor-pointer items-center justify-end text-gray-400">
            <svg
              className="fill-current"
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              onClick={() => setNavExpanded(false)}
            >
              <path d="M22 19.168L13.815 10.981L22 2.807L19.168 0L10.986 8.179L2.81 0L0 2.81L8.186 11.006L0 19.19L2.81 22L11.013 13.808L19.193 22L22 19.168Z" />
            </svg>
          </div>
        </div>
        <div
          className="mt-8 flex flex-col items-center space-y-16 text-3xl font-bold text-gray-800"
          onClick={() => setNavExpanded(false)}
        >
          <a href="#solution" className="no-underline">
            Product
          </a>
          <a href="#pricing" className="no-underline">
            Pricing
          </a>
          <a href="#company" className="no-underline">
            Company
          </a>
          <a href="#faq" className="no-underline">
            FAQ
          </a>
          <a
            href={getStartedUrl}
            className="mx-16 w-full cursor-pointer whitespace-nowrap rounded border-2 border-gray-900 p-6 text-center no-underline hover:bg-gray-100 md:border"
          >
            {signInOrUp}
          </a>
        </div>
      </div>
      <div style={navExpanded ? { height: "100vh", overflowY: "auto" } : undefined}>
        <div
          className="bg-brand-header bg-left-bottom bg-repeat-x pt-4 pb-32 text-white"
          style={{ backgroundImage: `url(${ZigZagWhite})` }}
        >
          <div id="top" className="mx-auto px-4 lg:px-0">
            <div className="flex items-center">
              <a href="/">
                <div className="relative my-4 flex-shrink-0 self-start bg-cover bg-no-repeat">
                  <Logo width="36" height="43" />
                </div>
              </a>
              <div className="hidden flex-1 flex-wrap items-center justify-end font-bold sm:flex">
                <a
                  href="#solution"
                  className="my-4 ml-12 cursor-pointer border-b-2 border-transparent text-white no-underline hover:border-white md:ml-16"
                >
                  Product
                </a>
                <a
                  href="#pricing"
                  className="my-4 ml-12 cursor-pointer border-b-2 border-transparent text-white no-underline hover:border-white md:ml-16"
                >
                  Pricing
                </a>
                <a
                  href="#company"
                  className="my-4 ml-12 cursor-pointer border-b-2 border-transparent text-white no-underline hover:border-white md:ml-16"
                >
                  Company
                </a>
                <a
                  href="#faq"
                  className="my-4 ml-12 cursor-pointer border-b-2 border-transparent text-white no-underline hover:border-white md:ml-16"
                >
                  FAQ
                </a>
                <a
                  href={getStartedUrl}
                  className="my-4 ml-12 cursor-pointer whitespace-nowrap rounded border border-white py-2 px-4 text-white no-underline hover:bg-gray-700 md:ml-16"
                >
                  {signInOrUp}
                </a>
              </div>
              <div className="flex flex-1 items-center justify-end sm:hidden">
                <FontAwesomeBars onClick={() => setNavExpanded(true)} />
              </div>
            </div>

            <div className="flex flex-col items-center lg:mt-8 lg:flex-row lg:items-start">
              <div className="mt-8 flex flex-1 justify-center antialiased lg:mt-16 lg:block">
                <div className="fbr-cover">
                  <h2 className="text-brand-pink-500 mb-2 text-center font-bold uppercase sm:text-xl lg:text-left">
                    B2B Customer Support
                  </h2>
                  <h1 className="text-center text-3xl font-bold text-purple-50 sm:text-5xl sm:leading-tight lg:-mr-16 lg:text-left">
                    When Your
                    <br />
                    <TypeAnimation
                      cursor={true}
                      sequence={typingWords1}
                      wrapper="span"
                      repeat={Infinity}
                      className="text-brand-purple-500"
                    />{" "}
                    Team
                    <br />
                    Needs to Support Your Customer’s
                    <br />
                    <TypeAnimation
                      cursor={true}
                      sequence={typingWords2}
                      wrapper="span"
                      repeat={Infinity}
                      className="text-brand-orange-500"
                    />{" "}
                    Team
                  </h1>
                  <div className="mt-8 sm:mt-24 text-center text-indigo-100 sm:text-2xl sm:leading-relaxed lg:text-left">
                    Use Fogbender to
                    <div className="relative h-6 sm:h-10 text-brand-red-500">
                      {benefits.map((x, i) => (
                        <div
                          key={i}
                          className={classNames(
                            "absolute top-0 left-0 right-0 lg:right-auto text-center transform transition duration-500",
                            i === benefitIdx
                              ? "translate-y-0 opacity-100"
                              : i % benefits.length === benefitIdx - 1
                              ? "-translate-y-full opacity-0"
                              : "translate-y-full opacity-0"
                          )}
                        >
                          {x}
                        </div>
                      ))}
                    </div>
                    with our purpose-built customer support solution.
                  </div>
                  <div className="my-8 flex flex-col items-center lg:my-16 lg:items-start">
                    <a
                      href={getStartedUrl}
                      className="bg-brand-pink-500 flex w-72 cursor-pointer items-center justify-center whitespace-nowrap rounded-md py-4 text-lg font-bold text-white no-underline"
                    >
                      Get started
                      <FontAwesomeArrowRight className="ml-3 opacity-50" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-4 w-full justify-center sm:w-3/4 md:mt-12 lg:mt-16 lg:ml-4 lg:flex-1">
                <VennCircles />
              </div>
            </div>
          </div>
        </div>

        <div
          id="problem"
          className="bg-white bg-left-bottom bg-repeat-x pt-16 pb-32 text-gray-700"
          style={{ backgroundImage: `url(${ZigZagSmall})` }}
        >
          <div className="my-16 mx-auto px-4 sm:px-8 md:px-16" style={{ maxWidth: 1100 }}>
            <h3 className="text-brand-pink-500 mb-4 font-bold uppercase sm:text-xl">The problem</h3>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-5xl sm:leading-tight">
              Support tools have been built for B2C and they don’t work for B2B
            </h2>
            <p className="mt-8 mb-12 sm:text-xl sm:leading-relaxed md:mt-12">
              B2B support is most effective when users within the same account can communicate with
              you as a group. Existing customer support tools don’t allow team to team
              conversations. Using these tools for supporting teams has <b>downsides</b>:
            </p>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-16 md:gap-y-8">
              <div className="flex items-start space-x-6">
                <span className="text-brand-pink-500">
                  <SmileySad />
                </span>
                <span>
                  Users can’t see a list of feature requests or bug reports opened against their
                  account by colleagues so <b>your team wastes time managing duplicate requests</b>
                </span>
              </div>
              <div className="flex items-start space-x-6">
                <span className="text-brand-pink-500">
                  <SmileySad />
                </span>
                <span>
                  Users don’t have an easy way to discover product experts on their own team so{" "}
                  <b>your team has to answer more requests</b>
                </span>
              </div>
              <div className="flex items-start space-x-6">
                <span className="text-brand-pink-500">
                  <SmileySad />
                </span>
                <span>
                  Users don’t learn from your answers to questions from colleagues so once again{" "}
                  <b>your team wastes time answering repeat questions</b>
                </span>
              </div>
              <div className="flex items-start space-x-6">
                <span className="text-brand-pink-500">
                  <SmileySad />
                </span>
                <span>
                  Your team can’t upsell, market to, or generally communicate with customer teams,
                  instead they have to reach out to individuals
                </span>
              </div>
              <div className="flex items-start space-x-6">
                <span className="text-brand-pink-500">
                  <SmileySad />
                </span>
                <span>
                  Your team can’t identify product champions or who actually uses your product on
                  customer teams, <b>increasing the cost of renewals and ultimately churn</b>
                </span>
              </div>
              <div className="flex items-start space-x-6">
                <span className="text-brand-pink-500">
                  <SmileySad />
                </span>
                <span>
                  Your team has to use tools not designed for customer support to fix this (e.g.
                  Slack shared channels), resulting in “shadow support” — critical, but unofficial,
                  and <b>hard to track, maintain and scale</b>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          id="nick"
          className="bg-white bg-left-bottom bg-repeat-x pt-16 pb-32 text-gray-700"
          style={{ backgroundImage: `url(${ZigZagSmall})` }}
        >
          <div className="my-10 flex w-full justify-center">
            <div className="flex w-9/12 flex-col gap-2 text-center text-lg sm:flex-row sm:text-left lg:w-1/2">
              <Avatar
                className="self-center"
                bgClassName="self-center"
                url={Nick}
                name="Nick Mehta"
                size={240}
              />
              <div className="flex flex-col gap-4 self-center">
                <div>
                  “Tooling around B2B customer support has long been overlooked by CSM vendors
                  &ndash; super excited to see Fogbender shake things up in the space!”
                </div>
                <div className="font-bold">
                  &mdash; Nick Mehta, CEO at{" "}
                  <a target="_blank" rel="noopener" href="https://gainsight.com">
                    Gainsight
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="solution"
          className="-mb-1 bg-white bg-left-bottom bg-repeat-x pt-16 pb-16 text-gray-700"
          style={{ backgroundImage: `url(${ZigZagSmallGray})` }}
        >
          <div className="my-16 mx-auto px-4 sm:px-8 md:px-16" style={{ maxWidth: 1100 }}>
            <h3 className="text-brand-pink-500 mb-4 font-bold uppercase sm:text-xl">
              The solution
            </h3>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-5xl sm:leading-tight">
              Our widget on your customer dashboard
            </h2>
            <p className="mt-8 mb-12 sm:text-2xl md:mt-12">
              The Fogbender support widget looks similar to other live chat solutions, but all users
              belonging to the same customer account can collaborate on support issues.
            </p>
            <h4 className="mt-16 text-3xl font-bold text-gray-900">
              The Fogbender team support widget
            </h4>
            <div className="my-4 sm:text-xl sm:leading-relaxed">
              Our widget embeds into your existing customer dashboard. Once logged in, users can
              <div className="mt-4 flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>Create new requests</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>View ongoing requests</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>View feature requests</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>Browse other conversations</span>
                </div>
              </div>
            </div>

            <h4 className="mt-16 text-3xl font-bold text-gray-900">
              The Fogbender vendor dashboard
            </h4>

            <div className="my-4 sm:text-xl sm:leading-relaxed">
              Our vendor dashboard allows everyone in your team to stay in the loop with all
              customer requests and conversations. Authorized agents can:
              <div className="mt-4 flex flex-col justfy-center space-y-4">
                <div className="flex items-center space-x-4">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>Manage multiple customer support rooms at the same time</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>
                    Link customer-facing conversations to tickets in a developer-facing issue
                    tracker (Jira, Asana, Trello, etc)
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>View important customer information via our CRM integrations</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>Open issues or feature requests</span>
                </div>
              </div>
            </div>

            <h4 className="mt-16 text-3xl font-bold text-gray-900">Product demo</h4>

            <div className="mt-8" ref={vimeoRef}>
              <div style={{ padding: "62.5% 0 0 0", position: "relative" }}>
                {activateVimeo && (
                  <iframe
                    title="Fogbender demo video"
                    src="https://player.vimeo.com/video/692116026?h=eaf31d1782&amp;portrait=0"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                    }}
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen={true}
                    loading="lazy"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div id="benefits" className="bg-gray-50 pt-16 pb-32 text-gray-700">
          <div className="my-16 mx-auto px-4 sm:px-8 md:px-16" style={{ maxWidth: 1100 }}>
            <h3 className="text-brand-pink-500 mb-4 font-bold uppercase sm:text-xl">Benefits</h3>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-5xl sm:leading-tight">
              Fogbender helps you &amp; your B2B customers
            </h2>
            <p className="mb-16 mt-10 sm:text-xl sm:leading-relaxed md:mt-16">
              B2B support organizations deserve a support tool designed for B2B. Fogbender is not a
              B2C product with some B2B-specific features sprinkled on top &mdash; it was built with
              B2B in mind from the get-go. Using a product purpose-built for your use case can have
              major benefits to your product lifecycle, your piece of mind, and your bottom line.
            </p>
            <div className="mb-8 flex flex-col border-b border-gray-200 pb-8 md:mb-16 md:flex-row md:pb-16">
              <h3 className="mb-8 flex-1 text-lg font-bold text-gray-800 sm:text-3xl sm:leading-relaxed">
                <b>
                  Better support, <br className="hidden md:block" />
                  faster responses
                </b>{" "}
                <br className="hidden md:block" />
                <span className="font-normal">to increase your NPS scores</span>
              </h3>
              <div className="flex-1 space-y-8 md:-ml-32">
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>Enable colleagues at the same customer company to help each other</span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>Decrease time-to-resolution, improve answer quality</span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>
                    Increase user engagement, build relationships, foster communities “for free”, as
                    a by-product of team-to-team support
                  </span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <SmileyHappy />
                  </span>
                  <span>
                    Use customer team-level reporting and analytics to fine-tune product roadmap and
                    simplify sprint planning
                  </span>
                </div>
              </div>
            </div>
            <div className="mb-8 flex flex-col border-b border-gray-200 pb-8 md:mb-16 md:flex-row md:pb-16">
              <h3 className="mb-8 flex-1 text-lg font-bold text-gray-800 sm:text-3xl sm:leading-relaxed">
                <b>
                  More productivity, <br className="hidden md:block" />
                  less complexity
                </b>{" "}
                <br className="hidden md:block" />
                <span className="font-normal">to lower your support costs</span>
              </h3>
              <div className="flex-1 space-y-8 md:-ml-32">
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <Rocket />
                  </span>
                  <span>
                    Use the same support system during trial, onboarding, expansion, and
                    continuity-and-succession phases of account lifecycle
                  </span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <Rocket />
                  </span>
                  <span>Avoid duplicate issues originating within the same account</span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <Rocket />
                  </span>
                  <span>Avoid customer-initiated DMs (vendor-initiated DMs are supported)</span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <Rocket />
                  </span>
                  <span>
                    Make all support conversations accessible to R&amp;D in read-only mode
                  </span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <Rocket />
                  </span>
                  <span>
                    Link support conversations to R&amp;D-facing tickets (Linear, Jira, Asana, etc)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row">
              <h3 className="mb-8 flex-1 text-lg font-bold text-gray-800 sm:text-3xl sm:leading-relaxed">
                <b>
                  Increased sales, <br className="hidden md:block" />
                  reduced churn
                </b>{" "}
                <br className="hidden md:block" />
                <span className="font-normal">to accelerate your growth</span>
              </h3>
              <div className="flex-1 space-y-8 md:-ml-32">
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <Coin />
                  </span>
                  <span>Increase organic upsell opportunities</span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <Coin />
                  </span>
                  <span>Always know the identities of your champions, within each account</span>
                </div>
                <div className="flex space-x-6">
                  <span className="text-brand-pink-500">
                    <Coin />
                  </span>
                  <span>
                    Uncover the potential of conversational marketing to teams, not individuals
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="features"
          className="-mt-16 bg-left-top bg-repeat-x pt-8 text-white"
          style={{ backgroundImage: `url(${ZigZagDark})` }}
        >
          <div className="bg-brand-header pt-16 pb-32">
            <div className="my-16 mx-auto px-4 sm:px-8 md:px-16" style={{ maxWidth: 1100 }}>
              <h3 className="text-brand-pink-500 mb-4 font-bold uppercase sm:text-xl">Features</h3>
              <h2 className="text-3xl font-bold sm:leading-tight md:text-4xl">
                Team messaging that keeps everyone in the loop
              </h2>
              <div className="my-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Keep up with all conversations
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    All public rooms are shared with the vendor (like shared channels)
                  </p>
                </div>
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Public room for each issue
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    The widget has an always-there room called Triage, and a number of other rooms
                    &mdash; each dedicated to a specific issue
                  </p>
                </div>
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Customers can interact
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    All users from the same account see the same information
                  </p>
                </div>
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Multi-room UI
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    Advanced messaging dashboard with tiled multi-room design
                  </p>
                </div>
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Advanced messaging features
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    Mentions, filesharing, replies to contiguous messages, forwarding contiguous
                    blocks of messages between rooms, markdown
                  </p>
                </div>
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Desktop &amp; email notifications
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    Desktop notifications and email digests inform users about new activity
                  </p>
                </div>
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Integrates with your CRM
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    Connect your CRM to Fogbender to collate account and customer support data
                  </p>
                </div>
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Reporting and analytics
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    Generate up-to-date, detailed reports from customer support data to fine-tune
                    your product roadmap and help steer sprint planning meetings
                  </p>
                </div>
                <div>
                  <p className="text-brand-pink-500 mb-2 font-bold leading-relaxed">
                    Jira, GitLab &amp; GitHub integration
                  </p>
                  <p className="leading-relaxed text-gray-50">
                    Two-way integrations with developer-facing ticketing systems
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="pricing"
          className="-mt-8 bg-left-top bg-repeat-x pt-24 pb-32 text-gray-700"
          style={{ backgroundImage: `url(${ZigZagWhite})` }}
        >
          <div className="my-16 mx-auto px-4 sm:px-8 md:px-16" style={{ maxWidth: 1100 }}>
            <h3 className="text-brand-pink-500 mb-4 font-bold uppercase sm:text-xl">
              Pricing for 2022
            </h3>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-5xl sm:leading-tight">
              Choose a plan to get your team started
            </h2>
            <p className="mt-8 mb-12 sm:text-lg md:mt-12">
              Fogbender is free for anyone on your team to read conversations with customers and to
              send messages to each other. Outside the “On the House” plan, you pay only when you
              use Fogbender to send messages to customers.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div
                className="mr-4 mt-4 flex w-64 flex-1 flex-col justify-self-center rounded-b border border-gray-200 px-2 text-center"
                style={{ minWidth: 200, maxWidth: 230 }}
              >
                <p className="-mx-2 whitespace-nowrap border-t-8 border-black pt-5 font-bold uppercase text-gray-400">
                  On the House
                </p>
                <p className="my-8 flex items-center justify-center space-x-2 whitespace-nowrap">
                  <span className="text-5xl font-bold text-gray-900">
                    $<span className="text-6xl">0</span>
                  </span>
                </p>
                <HowBilled content="Free" />
                <div className="flex flex-1 flex-col space-y-4 text-center text-sm">
                  <span>
                    Up to{" "}
                    <b>
                      <u data-tip="Agents can post messages in customer-facing rooms">2 agents</u>
                      <ReactTooltip />
                    </b>
                  </span>
                  <span>
                    Unlimited{" "}
                    <b>
                      <u data-tip="Readers cannot post messages in customer-facing rooms">
                        readers
                      </u>
                      <ReactTooltip />
                    </b>
                  </span>
                  <span>Unlimited history</span>
                  <span>Reporting, integrations, analytics</span>
                  <span>Single sign-on (SSO)</span>
                </div>
                <BookDemo />
              </div>
              <div
                className="mr-4 mt-4 flex w-64 flex-1 flex-col justify-self-center rounded-b border border-gray-200 px-2 text-center"
                style={{ minWidth: 200, maxWidth: 230 }}
              >
                <p className="border-brand-pink-500 -mx-2 whitespace-nowrap border-t-8 pt-5 font-bold uppercase text-gray-400">
                  Support
                </p>
                <p className="my-8 flex items-center justify-center space-x-2 whitespace-nowrap">
                  <span className="text-5xl font-bold text-gray-900">
                    $<span className="text-6xl">480</span>
                  </span>
                </p>
                <HowBilled
                  content={
                    <span>
                      Per{" "}
                      <span
                        data-tip="Agents can post messages in customer-facing rooms"
                        className="underline"
                      >
                        agent
                      </span>
                      , <span className="text-gray-700">per year</span>
                    </span>
                  }
                />
                <div className="flex flex-1 flex-col space-y-4 text-center text-sm">
                  <span>
                    Everything in <b>On the house</b>
                  </span>
                  <span>Security audit log</span>
                </div>
                <BookDemo />
              </div>
              <div
                className="mr-4 mt-4 flex w-64 flex-1 flex-col justify-self-center rounded-b border border-gray-200 px-2 text-center"
                style={{ minWidth: 200, maxWidth: 230 }}
              >
                <p className="border-brand-orange-500 -mx-2 whitespace-nowrap border-t-8 pt-5 font-bold uppercase text-gray-400">
                  Success
                </p>
                <p className="my-8 flex items-center justify-center space-x-2 whitespace-nowrap">
                  <span className="text-5xl font-bold text-gray-900">
                    $<span className="text-6xl">720</span>
                  </span>
                </p>
                <HowBilled
                  content={
                    <span>
                      Per{" "}
                      <span
                        data-tip="Agents can post messages in customer-facing rooms"
                        className="underline"
                      >
                        agent
                      </span>
                      , <span className="text-gray-700">per year</span>
                    </span>
                  }
                />
                <div className="flex flex-1 flex-col space-y-4 text-center text-sm">
                  <span>
                    Everything in <b>Support</b>
                  </span>
                  <span>Champion radar analytics</span>
                </div>
                <BookDemo />
              </div>
              <div
                className="mr-4 mt-4 flex w-64 flex-1 flex-col justify-self-center rounded-b border border-gray-200 px-2 text-center"
                style={{ minWidth: 200, maxWidth: 230 }}
              >
                <p className="border-brand-purple-500 -mx-2 whitespace-nowrap border-t-8 pt-5 font-bold uppercase text-gray-400">
                  Enterprise
                </p>
                <p className="my-8 flex items-center justify-center space-x-2 whitespace-nowrap py-1">
                  <span className="text-5xl font-bold text-gray-900">Let's talk</span>
                </p>
                <HowBilled content="Custom pricing" />
                <div className="flex flex-1 flex-col space-y-4 text-center text-sm">
                  <span>
                    Everything in <b>Success</b>
                  </span>
                  <span>Private deployment</span>
                  <span>White label</span>
                </div>
                <BookDemo />
              </div>
            </div>
          </div>
        </div>

        <div
          id="faq"
          className="-mt-16 bg-left-top bg-repeat-x pt-8 text-white"
          style={{ backgroundImage: `url(${ZigZagDark})` }}
        >
          <div className="bg-brand-header pt-16 pb-32">
            <div className="my-16 mx-auto px-4 sm:px-8 md:px-16" style={{ maxWidth: 1100 }}>
              <h3 className="text-brand-pink-500 mb-4 font-bold uppercase sm:text-xl">FAQ</h3>
              <h2 className="text-3xl font-bold sm:text-5xl sm:leading-tight">Common questions</h2>
              <div
                className="sm:mt-none text-brand-pink-500 mt-10 cursor-pointer text-right font-bold"
                onClick={() => setFaqExpandAll(!!!faqExpandAll)}
              >
                {faqExpandAll === true && <>Collapse all</>}
                {faqExpandAll !== true && <>Expand all</>}
              </div>
              <FaqItem
                id="faq-1"
                title="Can I try Fogbender with just a couple of customers?"
                expanded={faqExpandAll === undefined ? true : faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Yes &mdash; you can use feature flags or a similar approach to determine which
                  customers should see your existing contact form or live chat, and which ones
                  should see the new Fogbender widget. You can also load the Fogbender widget for
                  all new accounts.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-2"
                title="Are you saying we have to get rid of LiveChat / Front / Intercom / Drift / MessageBird?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  No &mdash; you may still need those to handle inbound questions from
                  unauthenticated users &mdash; this includes capturing sales leads, addressing
                  questions on Twitter and Facebook Messenger, and so on.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-3"
                title="So, you’re adding another tool to our customer support stack?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Not necessarily &mdash; if you use shared channels for support, we’d replace
                  those.
                </p>
                <p className="my-4 ml-6 mr-8">
                  If you’re using Zendesk for supporting authenticated users, we’d replace that.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-4"
                title="What’s the difference between B2B and B2C in terms of customer support?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  In B2C, the customer is a single individual who ages with the service (e.g.,
                  Netflix). In B2B, the customer is a group of people that changes its composition
                  over time (e.g., AWS).
                </p>
                <p className="my-4 ml-6 mr-8">
                  In B2C, there are many accounts with low{" "}
                  <span className="underline" data-tip="Annual Contract Value">
                    ACV
                  </span>
                  , requiring many dedicated support agents able to resolve most common problems,
                  but usually unable to conduct in-depth troubleshooting (e.g., CA EDD). In B2B,
                  there are few accounts with high ACV, with support provided by a highly-skilled,
                  relatively small team (which may include R&amp;D staff and sales engineers).
                </p>
                <ReactTooltip />
                <p className="my-4 ml-6 mr-8">
                  B2B products tend to be complex, requiring some degree of integration work on the
                  customer’s end (e.g., Twilio, Segment, AWS). This complicates support, because the
                  vendor is not necessarily aware of all the details pertaining to a specific
                  implementation.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-5"
                title="What’s the difference between Fogbender and using Slack’s Shared Channels?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Fogbender comes with an embeddable widget that lives on your customer dashboard
                  and uses your existing user authentication for access. Slack is a separate
                  application with multiple levels of access you can’t control (account, workspace,
                  channel).
                </p>
                <p className="my-4 ml-6 mr-8">
                  In Fogbender, you create an equivalent of a shared channel per issue, while in
                  Slack you’d usually have a single channel with many unnamed threads.
                </p>
                <p className="my-4 ml-6 mr-8">
                  In Slack the “unit of work” is one message &mdash; if you use an integration with
                  a ticketing system, you can create a ticket from a single message only. Fogbender
                  supports the selection of contiguous message blocks, which makes it possible to
                  file issues with all the necessary context (including images).
                </p>
                <p className="my-4 ml-6 mr-8">
                  A shared channel between teams A and B introduces the possibility of private 1-1
                  and group DMs between all members of A and B, which exposes the vendor to
                  untraceable, customer-initiated out-of-band communication. Fogbender only allows
                  vendor-initiated DMs.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-6"
                title="What’s the difference between Fogbender and Intercom?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Intercom’s communication model is many-to-one, where “many” is the vendor’s agents
                  and “one” is the customer end user. This works amazingly well for B2C customer
                  support, where an account consists of a single individual, or as a way of
                  capturing sales leads &mdash; speaking to an unauthenticated user exploring the
                  vendor’s website. Fogbender’s communication model is many-to-many, where a
                  customer account also consists of a team &mdash; designed purely for account-based
                  support and is not suitable for capturing leads. That said, it could work very
                  well for discovering upsell opportunities.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-7"
                title="What’s the difference between Fogbender and Front?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Front’s communication model for its live chat product is the same as Intercom’s
                  &mdash; many vendor agents to one customer end user.
                </p>
                <p className="my-4 ml-6 mr-8">
                  However, Front’s roots are in email &mdash; it’s arguably the most evolved shared
                  inbox product out there &mdash; and email supports many-to-many communication just
                  fine, simply because the To: or Cc: lines can list the email addresses of several
                  end user colleagues working at the same company. However, this workflow assumes
                  the end user knows whom to include on a support question; Fogbender lets the end
                  user discover the colleague that knows the answer or would like to be in on the
                  conversation.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-8"
                title="What’s the difference between Fogbender and Zendesk?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Zendesk Live chat’s model is the same as Intercom’s and Front’s: works great for
                  anonymous visitors or single-user accounts (e.g., Etsy), but there is no way to
                  place several colleagues in a conversation with a vendor.
                </p>
                <p className="my-4 ml-6 mr-8">
                  Zendesk’s email-based support product, where the customer initiates a conversation
                  with the vendor by sending an email or filling out a contact form, does have some
                  B2B support with Zendesk’s Organizations feature. Organizations allow the vendor
                  to reveal all historical support data to anyone &mdash; or a subset of privileged
                  users &mdash; belonging to an organization (i.e. a B2B customer). The two main
                  issues with this approach concern privacy &mdash; users generally assume their
                  communication with the vendor is not visible to colleagues, and the fact that
                  there is no obvious mechanism for a colleague to be notified of a new question in
                  order to have an opportunity to provide an answer in time.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-9"
                title="Are you saying that all currently-available customer support products are designed for B2C?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Yes, and for a good reason: the most successful consumer brands have hundreds of
                  millions of users, while the most successful B2B companies may have hundreds or
                  thousands of customer accounts. It makes sense that customer support software
                  vendors focus on the needs of their biggest revenue drivers first, leaving the
                  requirements of B2B vendors as perennial product roadmap nice-to-haves.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-10"
                title="Why would colleagues help each other out with a vendor’s product?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Colleagues already help each other out with products their companies have licensed
                  &mdash; partially because it’s human nature, partially because it’s their job.
                  These conversations are almost always internal &mdash; not visible to the vendor
                  &mdash; not because they have to be, but because vendors don’t generally furnish
                  customers with platforms that facilitate product discussions.
                </p>
                <p className="my-4 ml-6 mr-8">
                  The most obvious counter-argument here is the growing prevalence of Slack Connect
                  and Shared Channels in vendor-customer relationships.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-11"
                title="Why isn’t this a just a Slack app?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Team-to-team (B2B) support should be the default support method, meaning it must
                  be available on the vendor’s support page &mdash; this is hard to do with Slack.
                </p>
                <p className="my-4 ml-6 mr-8">
                  There is no easy way to select a group of messages in Slack to formalize a
                  description of a problem or a solution to one &mdash; this makes it difficult to
                  segment conversations and causes integrations with third-party ticketing systems
                  lose context.
                </p>
                <p className="my-4 ml-6 mr-8">
                  Slack enables all participants of a shared channel to participate in out-of-band
                  private conversations, which defeats the purpose of team-to-team customer support.
                </p>
                <p className="my-4 ml-6 mr-8">Some vendors and customers don’t use Slack.</p>
              </FaqItem>
              <FaqItem
                id="faq-12"
                title="Can I use Fogbender’s messaging API without using the support product?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Yes, it’s possible.{" "}
                  <a target="_blank" rel="noopener" href="https://teamedupapp.com">
                    TeamedUp
                  </a>{" "}
                  is a mobile-only social network for licensed physicians that uses Fogbender purely
                  as a messaging API.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-13"
                title="Can I use Fogbender’s embedded team messaging widget to add a community experience to my website?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Yes! You can think of your community as one account or customer that groups all
                  your users. The main challenge is explaining to your users the difference between
                  their account-level customer support and the community.
                </p>
              </FaqItem>
              <FaqItem
                id="faq-14"
                title="Why doesn’t Fogbender have threads?"
                expanded={faqExpandAll}
              >
                <p className="my-4 ml-6 mr-8">
                  Threads are either named or anonymous sub-rooms that contain a flat (non-threaded)
                  list of replies to a single message in a named room (channel, group, etc &mdash;
                  depending on the platform). Threads are helpful in busy spaces, where a
                  conversation that spans more than a few moments has a high likelihood of getting
                  trampled by another, making it very difficult to both maintain context in real
                  time and follow the train of thought while catching up later.
                </p>
                <p className="my-4 ml-6 mr-8">
                  This context-saving convenience comes at a price, however. For one, the simplicity
                  of an IRC/ICQ/SMS-style messaging experience &mdash; where a room is just a stream
                  of time-sorted messages &mdash; is sacrificed in favor of a fairly complex
                  structure where, in the extreme, the reader is required to expand every top-level
                  message to follow the conversation. Additionally, threads pose quite a challenge
                  with respect to notifications: being mentioned in multiple anonymous threads
                  across several channels may set up the recipient for a bit of an archeological
                  dig.
                </p>
                <p className="my-4 ml-6 mr-8">
                  Since Fogbender is not intended to have individual rooms that are continuously
                  used by large groups of people, the likelihood of conversations constantly
                  overlapping one another is low. That said, Fogbender does come with two features
                  that should serve as a sufficient alternative to threads:
                </p>
                <p className="my-4 ml-6 mr-8">
                  &bull; Replies to messages in the same room &mdash; very similar to WhatsApp and
                  Telegram, but with the added ability to reply to several messages at once;
                </p>
                <p className="my-4 ml-6 mr-8">
                  &bull; Forwarding a contiguous block of messages to an existing or a new room.
                  (The latter form can be thought of as "named thread support", but the intention is
                  to make it easier to categorize a group of messages as something important{" "}
                  <i>post-writing</i>, as opposed to helping with noise overload when responding.)
                </p>
              </FaqItem>
              <FaqItem id="faq-15" title="I still have questions" expanded={faqExpandAll}>
                <p className="my-4 ml-6 mr-8">I still have questions</p>
                <p className="my-4 ml-6 mr-8">
                  Book a demo below and we’ll answer all your questions, walk you through the
                  solution, and if you like, help you get started over a video call.
                </p>
              </FaqItem>
            </div>
          </div>
        </div>

        <div
          id="company"
          className="-mt-16 bg-left-top bg-repeat-x pt-8 text-gray-700"
          style={{ backgroundImage: `url(${ZigZagSmallGray})` }}
        >
          <div className="bg-gray-50 pt-16 pb-24">
            <div className="my-16 mx-auto px-4 sm:px-8 md:px-16" style={{ maxWidth: 1100 }}>
              <h3 className="text-brand-pink-500 mb-4 font-bold uppercase sm:text-xl">Company</h3>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-5xl sm:leading-tight">
                The Fogbender team
              </h2>
              <p className="mt-12 mb-20 sm:text-lg sm:leading-loose md:mt-16">
                Fogbender Software, Inc. is a Delaware C corporation headquartered in Oakland,
                California. The company was founded in 2020 by Andrei Soroker, Yaroslav Lapin, Mikl
                Kurkov, and Nikolai Gromin. Prior to Fogbender, the team (which previously included
                Peter Hizalev, who is now at{" "}
                <a
                  className="font-bold"
                  href="https://www.ycombinator.com/companies/tensil"
                  target="_blank"
                  rel="noopener"
                >
                  Tensil
                </a>
                ) built{" "}
                <a
                  className="font-bold"
                  href="https://techcrunch.com/2014/08/27/kato-im-launches-kato-teams-a-free-chat-platform-for-businesses/"
                  target="_blank"
                  rel="noopener"
                >
                  Kato
                </a>{" "}
                (2013 &ndash; 2015) &mdash; a team messaging product conceptually similar to Slack,{" "}
                <a className="font-bold" href="https://sameroom.io" target="_blank" rel="noopener">
                  Sameroom.io
                </a>{" "}
                (2015 &ndash; now) &mdash; a team messaging interoperability solution conceptually
                similar to Slack’s Shared Channels, and{" "}
                <a
                  className="font-bold"
                  href="https://www.8x8.com/products/team-chat"
                  target="_blank"
                  rel="noopener"
                >
                  8x8 Team Chat
                </a>{" "}
                (2018 &ndash; now), following the sale of Sameroom to NYSE:EGHT in 2017.
              </p>
              <div className="flex w-full flex-col flex-wrap items-center justify-center gap-8 md:flex-row">
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamAndrei} name="Andrei Soroker" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Andrei Soroker</span>
                  <span className="text-gray-500">CEO</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamMikl} name="Mikl Kurkov" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Mikl Kurkov</span>
                  <span className="text-gray-500">CTO</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamYaroslav} name="Yaroslav Lapin" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Yaroslav Lapin</span>
                  <span className="text-gray-500">VP Engineering</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamAndrey} name="Andrey Kravtsov" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Andrey Kravtsov</span>
                  <span className="text-gray-500">Design</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamNiral} name="Niral Patel" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Niral Patel</span>
                  <span className="text-gray-500">Marketing</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamAgata} name="Agata Yurina" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Agata Yurina</span>
                  <span className="text-gray-500">Engineering</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamAzikiwe} name="Azikiwe Wicker" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Azikiwe Wicker</span>
                  <span className="text-gray-500">Engineering</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamShawn} name="Shawn Kung" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Shawn Kung</span>
                  <span className="text-gray-500">Advisor</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamLuke} name="Luke Beatty" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Luke Beatty</span>
                  <span className="text-gray-500">Advisor</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamAndy} name="Andy Chou" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Andy Chou</span>
                  <span className="text-gray-500">Investor</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamBrezina} name="Matt Brezina" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Matt Brezina</span>
                  <span className="text-gray-500">Investor</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <Avatar url={TeamBen} name="Ben Davenport" size={80} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Ben Davenport</span>
                  <span className="text-gray-500">Investor</span>
                </div>
                <div className="flex flex-1 flex-col items-center whitespace-nowrap px-2 py-2">
                  <div style={{ height: 15 }} />
                  <img src={fixType(TeamYc)} height={50} width={50} alt="Y Combinator" />
                  <div style={{ height: 15 }} />
                  <span className="mt-4 mb-2 font-bold text-gray-900">Y Combinator</span>
                  <span className="text-gray-500">Investor</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="book-a-demo"
          className="-mt-8 bg-left-top bg-repeat-x pt-24 pb-32 text-gray-700"
          style={{ backgroundImage: `url(${ZigZagWhite})` }}
        >
          <div className="mx-auto" style={{ maxWidth: 1100, width: "100%" }} ref={calendlyRef}>
            <h2 className="text-center text-5xl font-bold leading-tight text-gray-900 sm:text-6xl">
              Ready to try Fogbender?
            </h2>
            <p className="mt-8 text-center text-lg">
              <span className="text-brand-pink-500 text-xl font-bold">Book a demo</span> below and
              we’ll answer all your questions, <br className="hidden sm:block" />
              walk you through a demo, and help you get started over a video call.
            </p>
            {InlineWidgetActivated}
            <div
              style={{ maxWidth: 800 }}
              className="fbr-subscribe relative mx-auto text-lg text-gray-900"
            >
              <div className="mx-4 rounded-lg bg-gray-100 p-8 sm:mx-0">
                <p className="mb-4 text-center font-bold">
                  Not ready to try, but want to keep tabs on our progress?
                </p>
                <p className="mb-4 text-center">
                  Subscribe to our mailing list here or drop us a note at{" "}
                  <a href="mailto:hello@fogbender.com">hello@fogbender.com</a>{" "}
                </p>
                {messageState !== "success" && (
                  <form
                    className="mt-8 flex flex-col gap-2 sm:flex-row sm:gap-0 sm:px-12"
                    onSubmit={onSubscribeSubmit}
                  >
                    <input
                      type="email"
                      name="email"
                      placeholder="Your email"
                      disabled={messageState === "pending"}
                      className={classNames(
                        "flex-1 rounded-lg border border-white py-2 px-4 focus:outline-none sm:rounded-r-none",
                        messageState === "failure" && "border-brand-orange-500"
                      )}
                    />
                    <button
                      type="submit"
                      disabled={messageState === "pending"}
                      className="bg-brand-pink-500 rounded-lg py-2 px-4 font-bold text-white sm:rounded-l-none"
                    >
                      Subscribe
                    </button>
                  </form>
                )}
                {messageState === "success" && (
                  <p className="text-brand-pink-500 py-4 px-4 text-center text-xl font-bold">
                    Subscribed!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className="-mt-16 bg-left-top bg-repeat-x pt-8 font-bold text-white"
          style={{ backgroundImage: `url(${ZigZagDark})` }}
        >
          <div className="bg-brand-header pt-16 pb-32">
            <div className="mx-auto mt-16 px-8 md:px-32" style={{ maxWidth: 1100 }}>
              <div className="flex flex-wrap">
                <div className="flex flex-col space-y-8 pr-16 pb-8">
                  <a href="#solution" className="no-underline hover:underline">
                    Product
                  </a>
                  <a href="#pricing" className="no-underline hover:underline">
                    Pricing
                  </a>
                  <a href="#company" className="no-underline hover:underline">
                    Company
                  </a>
                </div>
                <div className="flex flex-col space-y-8 pr-16 pb-8">
                  <a href="mailto:hello@fogbender.com" className="no-underline hover:underline">
                    Contact
                  </a>
                  <a href="#faq" className="no-underline hover:underline">
                    FAQ
                  </a>
                  <a
                    href="/blog"
                    target="_blank"
                    rel="noopener"
                    className="no-underline hover:underline"
                  >
                    Blog
                  </a>
                </div>
                <div className="flex flex-col space-y-8 pr-16 pb-8">
                  <a
                    href="https://twitter.com/fogbender"
                    target="_blank"
                    rel="noopener"
                    className="no-underline hover:underline"
                  >
                    Twitter
                  </a>
                  <a
                    href="https://www.linkedin.com/company/fogbender/"
                    target="_blank"
                    rel="noopener"
                    className="no-underline hover:underline"
                  >
                    Linkedin
                  </a>
                </div>
                <div className="flex flex-col space-y-8 pr-16 pb-8">
                  <a
                    href="https://github.com/fogbender/legal/blob/master/privacy-policy.txt"
                    target="_blank"
                    rel="noopener"
                    className="no-underline hover:underline"
                  >
                    Privacy
                  </a>
                  <a
                    href="https://github.com/fogbender/legal/blob/master/terms-of-service.txt"
                    target="_blank"
                    rel="noopener"
                    className="no-underline hover:underline"
                  >
                    Terms
                  </a>
                </div>
                <div className="mt-8 flex flex-1 flex-col space-y-6 pb-8 sm:mt-0">
                  {messageState !== "success" && <p>Join our mailing list</p>}
                  {messageState !== "success" && (
                    <form
                      className="flex w-full self-start rounded bg-white"
                      onSubmit={onSubscribeSubmit}
                    >
                      <input
                        type="email"
                        name="email"
                        placeholder="Your email"
                        className="flex-1 rounded-l py-2 px-4 text-gray-900 focus:outline-none"
                      />
                      <button type="submit" className="px-2">
                        <FontAwesomeArrowRight className="text-brand-header" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <div className="mt-16 flex w-full flex-col flex-wrap items-center font-normal md:flex-row">
                <span
                  className="flex-1 md:self-start"
                  onClick={() => {
                    setShowVersion(true);
                  }}
                >
                  &copy; {new Date().getFullYear()} Fogbender Software, Inc.
                  {showVersion && (
                    <span title={version.debugVersion}>
                      , version {version.niceVersion}
                      {versionData && <span>, server {versionData.version}</span>}
                      {versionError && <span>, failed to load version {versionError}</span>}
                    </span>
                  )}
                </span>
                <span className="ml-4 whitespace-nowrap md:self-end md:text-right">
                  In memory of{" "}
                  <a href="https://maximumfun.org/evan/" target="_blank" rel="noopener">
                    Evan Larsen
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReactTooltip = () => {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  if (isMounted) {
    return <ReactTooltipOriginal />;
  } else {
    return null;
  }
};

const SmileySad = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23 12C23 13.4445 22.7155 14.8749 22.1627 16.2095C21.6099 17.5441 20.7996 18.7567 19.7782 19.7782C18.7567 20.7996 17.5441 21.6099 16.2095 22.1627C14.8749 22.7155 13.4445 23 12 23C10.5555 23 9.12506 22.7155 7.79048 22.1627C6.4559 21.6099 5.24327 20.7996 4.22183 19.7782C3.20038 18.7567 2.39013 17.5441 1.83733 16.2095C1.28452 14.8749 1 13.4445 1 12C1 9.08262 2.15893 6.28473 4.22183 4.22183C6.28473 2.15893 9.08262 1 12 1C14.9174 1 17.7153 2.15893 19.7782 4.22183C21.8411 6.28473 23 9.08262 23 12Z"
        stroke="#FE346E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="9" r="2" fill="currentColor" />
      <circle cx="17" cy="9" r="2" fill="currentColor" />
      <path
        d="M7 15.5C9.35294 15.8333 14.6471 16.6667 17 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

const SmileyHappy = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23 12C23 13.4445 22.7155 14.8749 22.1627 16.2095C21.6099 17.5441 20.7996 18.7567 19.7782 19.7782C18.7567 20.7996 17.5441 21.6099 16.2095 22.1627C14.8749 22.7155 13.4445 23 12 23C10.5555 23 9.12506 22.7155 7.79048 22.1627C6.4559 21.6099 5.24327 20.7996 4.22183 19.7782C3.20038 18.7567 2.39013 17.5441 1.83733 16.2095C1.28452 14.8749 1 13.4445 1 12C1 9.08262 2.15893 6.28473 4.22183 4.22183C6.28473 2.15893 9.08262 1 12 1C14.9174 1 17.7153 2.15893 19.7782 4.22183C21.8411 6.28473 23 9.08262 23 12Z"
        stroke="#FE346E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="9" r="2" fill="#FF2E6D" />
      <circle cx="16" cy="9" r="2" fill="#FF2E6D" />
      <path d="M6 15C9 19 15 19 18 15" stroke="#FE346E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

const Rocket = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <path
        d="M23.948.042A17.934 17.934 0 0022.734 0c-8.6 0-13.497 6.557-15.278 11.833l4.727 4.727C17.611 14.616 24 9.9 24 1.392c0-.44-.017-.89-.052-1.35zM12.671 14.22l-2.883-2.883c1.221-2.859 4.691-8.945 12.199-9.32-.251 5.775-4.041 9.932-9.316 12.203zm5.471 1.538c-.547.373-1.09.71-1.628 1.011-.187.891-.662 1.842-1.351 2.652-.002-.576-.162-1.156-.443-1.738a23.86 23.86 0 01-1.414.588c.66 1.709-.012 2.971-.915 4.154 1.296-.098 2.656-.732 3.728-1.805 1.155-1.155 1.967-2.823 2.023-4.862zM6.322 9.289c-.579-.28-1.158-.438-1.732-.441.803-.681 1.744-1.153 2.626-1.345.314-.552.667-1.097 1.039-1.633-2.039.055-3.708.867-4.864 2.023-1.071 1.071-1.706 2.433-1.804 3.728 1.184-.904 2.446-1.576 4.155-.914.173-.471.366-.944.58-1.418zm7.738.663a.999.999 0 111.414-1.414 1 1 0 11-1.414 1.414zm4.949-4.951a2 2 0 10-2.826 2.829 2 2 0 002.826-2.829zm-1.908 1.911a.7.7 0 01.99-.99.703.703 0 010 .99.703.703 0 01-.99 0zm-6.747 10.65C8.862 21.372 4.551 23.77 0 24c.219-4.289 2.657-8.676 6.64-10.153l.805.806c-4.331 2.755-4.653 5.346-4.665 6.575 1.268-.015 4.054-.344 6.778-4.464l.796.798z"
        fill="currentColor"
      />
    </svg>
  );
};

const Coin = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <path
        d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10S2 17.514 2 12 6.486 2 12 2zm0-2C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4 14.083c0-2.145-2.232-2.742-3.943-3.546-1.039-.54-.908-1.829.581-1.916.826-.05 1.675.195 2.443.465l.362-1.647A9.22 9.22 0 0013 7.018V6h-1v1.067c-1.945.267-2.984 1.487-2.984 2.85 0 2.438 2.847 2.81 3.778 3.243 1.27.568 1.035 1.75-.114 2.011-.997.226-2.269-.168-3.225-.54L9 16.275c.894.462 1.965.708 3 .727V18h1v-1.053c1.657-.232 3.002-1.146 3-2.864z"
        fill="currentColor"
      />
    </svg>
  );
};

const FaqItem: React.FC<{ id: string; title: string; expanded?: boolean }> = ({
  id,
  title,
  expanded,
  children,
}) => {
  const [isExpanded, setIsExpanded] = React.useState<boolean>();

  React.useEffect(() => {
    setIsExpanded(expanded);
  }, [expanded]);

  React.useEffect(() => {
    if (window.location.hash === `#${id}`) {
      setIsExpanded(true);
    }
  }, [id]);

  return (
    <div id={id} className="my-10 leading-loose text-gray-400 sm:my-8">
      <div
        className="flex h-full cursor-pointer font-bold text-gray-100"
        onClick={() => {
          setIsExpanded(isExpanded => !isExpanded);
          if (!isExpanded) {
            window.location.hash = `#${id}`;
          }
        }}
      >
        <div className="flex-1 self-center text-lg">{title}</div>
        <div className="text-brand-pink-500 ml-1 self-start font-mono text-3xl leading-none">
          {isExpanded ? <>&ndash;</> : "+"}
        </div>
      </div>
      {isExpanded && children}
    </div>
  );
};

const HowBilled: React.FC<{ content: string | React.ReactNode }> = ({ content }) => (
  <p className="mx-4 mb-4 border-b border-gray-300 pb-4 text-sm text-gray-400">{content}</p>
);

const BookDemo = () => (
  <div className="mt-8 mb-4">
    <a
      href="#book-a-demo"
      className="inline-block whitespace-nowrap rounded-md bg-gray-200 py-4 px-14 font-bold text-gray-600 no-underline"
    >
      Book a demo
    </a>
  </div>
);

const Logo: React.FC<{ width: string; height: string }> = ({ width, height }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 83 99"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Fogbender Home</title>
    <path d="M17.8439 0L0 60.4379L17.8439 98.1693L36.6156 60.4379L17.8439 0Z" fill="#FE346E" />
    <path
      d="M32.3394 79.8936L40.9807 98.1659L59.2716 61.4007L40.9807 0L32.3623 30.4349L41.8109 60.8557L32.3394 79.8936Z"
      fill="#FF7315"
    />
    <path
      d="M55.474 79.8937L64.1153 98.1659L82.4062 61.4007L64.1153 0L55.3008 31.1277L64.4521 61.8477L55.474 79.8937Z"
      fill="#7E0CF5"
    />
  </svg>
);

const VennCircles = () => (
  <svg
    viewBox="0 0 504 477"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="block h-auto w-full"
  >
    <title>
      Fogbender combines the features of Intercom's live chat, Zendesk's ticketing system, and
      Slack's shared channels
    </title>
    <g clipPath="url(#clip0)">
      <g clipPath="url(#clip1)">
        <path
          d="M242.365 215.297l-7.823 26.498 7.823 16.543 8.231-16.543-8.231-26.498z"
          fill="#FE346E"
        />
        <path
          d="M248.721 250.326l3.788 8.011 8.02-16.12-8.02-26.92-3.778 13.344 4.142 13.338-4.152 8.347z"
          fill="#FF7315"
        />
        <path
          d="M258.864 250.326l3.789 8.011 8.019-16.12-8.019-26.92-3.865 13.648 4.012 13.468-3.936 7.913z"
          fill="#7E0CF5"
        />
      </g>
    </g>
    <circle
      cx="338.035"
      cy="311.558"
      r="163.828"
      stroke="#7E0CF5"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="10 5"
    />
    <circle
      cx="251.515"
      cy="165.753"
      r="163.828"
      stroke="#FF7315"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="10 5"
    />
    <circle
      cx="164.996"
      cy="311.558"
      r="163.828"
      stroke="#EC4899"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="10 5"
    />
    <g clipPath="url(#clip2)">
      <g clipPath="url(#clip3)" fill="#fff">
        <path d="M193.691 273.499h12.533l.241 5.013h-.433c-.595-1.735-1.286-2.916-2.073-3.543-.771-.626-1.928-.94-3.471-.94h-.675v7.833h1.085c.771 0 1.414-.281 1.928-.843.514-.563.868-1.334 1.06-2.314h.362v7.134h-.41c-.257-1.205-.618-2.065-1.084-2.579-.45-.514-1.069-.771-1.856-.771h-1.085v7.351h2.989v.53h-9.111v-.53h1.422v-15.811h-1.422v-.53zM214.274 285.622v-2.049c0-1.559-.088-2.691-.265-3.398-.161-.723-.546-1.085-1.157-1.085-.353 0-.643.105-.867.313-.209.193-.362.523-.458.989-.145.723-.217 1.823-.217 3.301v1.88c0 1.752.048 2.804.144 3.158.113.353.225.643.338.867.176.386.522.579 1.036.579.627 0 1.036-.362 1.229-1.085.145-.514.217-1.671.217-3.47zm-1.494 4.989c-2.009 0-3.527-.514-4.555-1.543-1.029-1.028-1.543-2.498-1.543-4.41 0-1.929.546-3.407 1.639-4.435 1.109-1.045 2.659-1.567 4.652-1.567 1.992 0 3.478.482 4.459 1.446.98.948 1.47 2.402 1.47 4.363 0 4.097-2.041 6.146-6.122 6.146zM229.241 277.644l.674-.41c.097-.498-.096-.747-.578-.747-.691 0-1.036.53-1.036 1.591 0 .418.056.9.168 1.446 1.222.819 1.832 1.872 1.832 3.157 0 1.27-.442 2.258-1.326 2.965-.883.707-2.08 1.06-3.591 1.06-.626 0-1.277-.064-1.952-.193-.707.45-1.06.788-1.06 1.013 0 .225.514.337 1.542.337h2.458c3.648 0 5.472 1.31 5.472 3.929 0 1.414-.555 2.53-1.663 3.35-1.093.835-2.804 1.253-5.134 1.253-3.969 0-5.953-.859-5.953-2.579 0-.932.618-1.574 1.856-1.928l1.446.651a4.972 4.972 0 00-.193 1.325c0 1.382 1.028 2.073 3.085 2.073 1.253 0 2.217-.233 2.892-.699.675-.466 1.012-1.044 1.012-1.735 0-.691-.209-1.157-.626-1.398-.402-.225-1.213-.337-2.435-.337h-2.337c-1.302 0-2.234-.217-2.796-.651-.563-.434-.844-.964-.844-1.591 0-.643.201-1.173.603-1.591.401-.433 1.116-.964 2.145-1.59-1.864-.531-2.796-1.752-2.796-3.664 0-1.205.434-2.177 1.301-2.916.868-.739 2.17-1.109 3.905-1.109 1.044 0 1.936.201 2.675.603a5.517 5.517 0 01-.144-1.181c0-.9.241-1.551.723-1.953.482-.401 1.02-.602 1.615-.602.594 0 1.068.161 1.422.482.369.305.554.731.554 1.277 0 .547-.145.956-.434 1.23a1.539 1.539 0 01-1.06.385c-.402 0-.74-.104-1.013-.313-.257-.225-.393-.538-.409-.94zm-5.11 4.507v1.301c0 1.077.088 1.808.265 2.194.193.385.474.578.844.578.385 0 .658-.185.819-.554.177-.386.265-1.165.265-2.338v-1.181c0-1.253-.08-2.073-.241-2.458-.16-.402-.434-.603-.819-.603-.37 0-.651.209-.844.627-.193.401-.289 1.213-.289 2.434zM240.965 283.886c0-1.655-.08-2.763-.241-3.326-.161-.578-.474-.867-.94-.867-.466 0-.884.289-1.253.867-.37.579-.554 1.374-.554 2.386v4.483c0 .691.136 1.278.409 1.76.289.482.691.723 1.205.723.531 0 .892-.354 1.085-1.061.193-.707.289-1.944.289-3.711v-1.254zm-2.988-11.593v8.436c.61-1.382 1.655-2.073 3.133-2.073 3.004 0 4.507 2.001 4.507 6.002 0 2.04-.418 3.543-1.254 4.507-.819.964-2.056 1.446-3.711 1.446-.836 0-1.478-.129-1.928-.386-.434-.257-.731-.683-.892-1.277l-.169 1.422h-5.495v-.434h1.326v-17.209h-1.326v-.434h5.809zM252.676 290.611c-2.073 0-3.632-.531-4.676-1.591-1.028-1.077-1.542-2.563-1.542-4.459 0-1.912.578-3.374 1.735-4.386 1.173-1.013 2.659-1.519 4.459-1.519 3.647 0 5.399 1.832 5.254 5.495h-6.797v.94c0 1.575.201 2.764.603 3.567.402.804 1.101 1.206 2.097 1.206 1.864 0 3.085-.997 3.663-2.989l.434.072c-.305 1.157-.86 2.057-1.663 2.7-.787.642-1.977.964-3.567.964zm-1.542-6.942h2.482v-1.181c0-1.301-.08-2.185-.241-2.651-.145-.482-.45-.723-.916-.723-.45 0-.787.257-1.012.771-.209.499-.313 1.366-.313 2.603v1.181zM258.813 278.897h5.809v2.218c.257-.74.65-1.334 1.18-1.784.53-.45 1.334-.675 2.411-.675 2.49 0 3.735 1.342 3.735 4.025v7.255h1.35v.434h-6.821v-.434h.988v-7.833c0-.964-.064-1.583-.192-1.856-.129-.289-.362-.434-.699-.434-.515 0-.972.338-1.374 1.012-.386.675-.578 1.495-.578 2.459v6.652h1.036v.434h-6.845v-.434h1.325v-10.605h-1.325v-.434zM278.509 285.381c0 1.687.089 2.812.265 3.374.177.546.498.819.964.819.482 0 .892-.208 1.229-.626.354-.418.531-1.037.531-1.856v-5.254c0-.691-.137-1.278-.41-1.76-.273-.482-.675-.723-1.205-.723s-.892.354-1.084 1.061c-.193.707-.29 1.944-.29 3.711v1.254zm3.302 4.989l-.265-1.687c-.546 1.285-1.655 1.928-3.326 1.928-1.382 0-2.458-.498-3.23-1.494-.755-.997-1.133-2.483-1.133-4.459 0-4.001 1.591-6.002 4.773-6.002 1.414 0 2.346.394 2.795 1.181v-7.11h-1.47v-.434h6.026v17.643h1.181v.434h-5.351zM294.125 290.611c-2.073 0-3.631-.531-4.676-1.591-1.028-1.077-1.542-2.563-1.542-4.459 0-1.912.578-3.374 1.735-4.386 1.173-1.013 2.659-1.519 4.459-1.519 3.647 0 5.398 1.832 5.254 5.495h-6.797v.94c0 1.575.201 2.764.603 3.567.401.804 1.1 1.206 2.097 1.206 1.864 0 3.084-.997 3.663-2.989l.434.072c-.306 1.157-.86 2.057-1.663 2.7-.787.642-1.976.964-3.567.964zm-1.543-6.942h2.483v-1.181c0-1.301-.081-2.185-.241-2.651-.145-.482-.45-.723-.916-.723-.45 0-.788.257-1.012.771-.209.499-.314 1.366-.314 2.603v1.181zM308.263 279.572c-.594 0-1.117.386-1.566 1.157-.45.771-.676 1.687-.676 2.748v6.459h1.712v.434h-7.52v-.434h1.326v-10.605h-1.326v-.434h5.808v2.314c.21-.819.611-1.446 1.206-1.88a3.266 3.266 0 012.025-.675c.754 0 1.365.217 1.831.651.482.418.723 1.02.723 1.808 0 .771-.177 1.365-.53 1.783-.354.418-.9.627-1.639.627-.723 0-1.261-.241-1.615-.723-.337-.482-.377-1.149-.12-2.001h.867c.402-.819.233-1.229-.506-1.229z" />
      </g>
    </g>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M374.188 353.448l.993-2.301c1.073.8 2.503 1.216 3.914 1.216 1.041 0 1.701-.4 1.701-1.006-.016-1.695-6.239-.368-6.287-4.618-.016-2.159 1.908-3.822 4.634-3.822 1.621 0 3.238.4 4.394 1.311l-.929 2.349c-1.058-.673-2.373-1.152-3.625-1.152-.85 0-1.41.4-1.41.911.016 1.663 6.286.752 6.35 4.811 0 2.206-1.876 3.758-4.57 3.758-1.975-.003-3.787-.466-5.165-1.457zm38.154-3.132a2.886 2.886 0 01-2.503 1.453 2.86 2.86 0 01-2.869-2.859 2.863 2.863 0 012.869-2.86c1.073 0 2.006.59 2.503 1.454l2.742-1.518a6.035 6.035 0 00-5.245-3.069c-3.322 0-6.016 2.685-6.016 5.996 0 3.31 2.694 5.995 6.016 5.995a5.982 5.982 0 005.245-3.069l-2.742-1.523zm-27.04-12.372h3.433v16.736h-3.433v-16.736zm31.129 0v16.736h3.433v-5.021l4.073 5.021h4.395l-5.181-5.964 4.796-5.564h-4.204l-3.882 4.618v-9.826h-3.43z"
      fill="#F5F3FF"
    />
    <path
      d="M398.935 350.347c-.497.816-1.522 1.422-2.678 1.422a2.86 2.86 0 01-2.87-2.859 2.863 2.863 0 012.87-2.86c1.156 0 2.181.638 2.678 1.469v2.828zm0-7.192v1.359c-.561-.943-1.956-1.6-3.417-1.6-3.016 0-5.389 2.653-5.389 5.98 0 3.326 2.373 6.011 5.389 6.011 1.458 0 2.853-.654 3.417-1.6v1.359h3.433v-11.509h-3.433z"
      fill="#F5F3FF"
    />
    <path
      d="M342.369 377.129c-.827 0-1.519-.119-2.075-.357-.544-.25-.947-.573-1.208-.97a2.307 2.307 0 01-.391-1.293v-.272a.958.958 0 00.017-.102h1.48v.17c0 .533.21.936.629 1.208.42.261.964.391 1.634.391.578 0 1.054-.113 1.429-.34.385-.238.578-.567.578-.987 0-.329-.108-.595-.323-.799a2.124 2.124 0 00-.8-.494 10.811 10.811 0 00-1.293-.391c-.658-.17-1.196-.34-1.616-.51a2.91 2.91 0 01-1.055-.749c-.283-.34-.425-.777-.425-1.31 0-.782.318-1.401.953-1.854.646-.465 1.514-.698 2.603-.698.68 0 1.27.114 1.769.341.499.215.873.51 1.123.884.26.363.391.771.391 1.225l-.017.323h-1.463v-.153c0-.397-.159-.726-.477-.987-.306-.26-.805-.391-1.497-.391-.68 0-1.156.125-1.429.374-.272.239-.408.517-.408.834a.83.83 0 00.289.647c.193.17.431.306.715.408.283.102.68.215 1.191.34.703.182 1.276.363 1.718.544.442.171.816.437 1.123.8.317.352.476.822.476 1.412 0 .919-.335 1.61-1.004 2.075-.657.454-1.536.681-2.637.681zm5.444-12.504h1.497v4.355h.119c.624-.805 1.566-1.208 2.824-1.208 1.86 0 2.79 1.015 2.79 3.045v6.108h-1.497v-6.005c0-.715-.158-1.208-.476-1.48-.318-.284-.777-.426-1.378-.426-.431 0-.828.108-1.191.323a2.22 2.22 0 00-.867.902c-.216.397-.324.862-.324 1.395v5.291h-1.497v-12.3zm11.886 12.504c-.771 0-1.457-.182-2.058-.544-.602-.363-.902-1.021-.902-1.974 0-1.145.51-1.928 1.531-2.347 1.021-.431 2.495-.647 4.423-.647v-.987c0-.521-.147-.918-.442-1.19-.295-.284-.828-.426-1.599-.426-.726 0-1.248.136-1.565.409-.307.272-.46.606-.46 1.003v.204h-1.446a2.745 2.745 0 01-.017-.374c0-.794.329-1.406.987-1.837.658-.431 1.537-.647 2.637-.647 1.111 0 1.956.233 2.535.698.578.465.867 1.123.867 1.973v4.849c0 .204.057.357.17.459a.66.66 0 00.426.136h.68v.97c-.295.136-.68.204-1.157.204-.385 0-.709-.114-.969-.34a1.787 1.787 0 01-.528-.936h-.119c-.306.42-.726.749-1.259.987a4.13 4.13 0 01-1.735.357zm.391-1.242c.443 0 .862-.091 1.259-.272.397-.182.72-.448.97-.8.249-.363.374-.799.374-1.31v-.646c-1.463 0-2.563.119-3.3.357-.726.227-1.089.664-1.089 1.31 0 .488.147.839.442 1.055.307.204.755.306 1.344.306zm6.629-7.911h1.14l.17 1.344h.102c.17-.442.426-.81.766-1.105.34-.295.788-.443 1.344-.443.306 0 .572.046.799.136v1.446h-.629c-.635 0-1.163.188-1.582.562-.409.363-.613.936-.613 1.718v5.291h-1.497v-8.949zm9.459 9.153c-1.44 0-2.512-.38-3.215-1.14-.703-.76-1.055-1.939-1.055-3.538 0-1.599.352-2.779 1.055-3.539.703-.76 1.775-1.14 3.215-1.14 1.293 0 2.257.346 2.892 1.038.647.681.97 1.781.97 3.3v.749h-6.584c.057 1.032.301 1.798.732 2.297.442.487 1.105.731 1.99.731.715 0 1.293-.164 1.735-.493.443-.329.664-.834.664-1.514h1.463c0 1.043-.363 1.848-1.089 2.415-.714.556-1.639.834-2.773.834zm2.297-5.512c0-1.735-.766-2.603-2.297-2.603-.851 0-1.491.204-1.922.613-.42.408-.675 1.071-.766 1.99h4.985zm6.356 5.512c-1.134 0-2.007-.38-2.619-1.14-.613-.76-.919-1.939-.919-3.538 0-1.565.3-2.734.902-3.505.612-.782 1.446-1.174 2.5-1.174.635 0 1.174.097 1.616.29.443.192.811.504 1.106.935h.102v-4.372h1.497v12.3h-1.122l-.188-1.208h-.102a2.841 2.841 0 01-1.173 1.055 3.533 3.533 0 01-1.6.357zm.375-1.242c.805 0 1.389-.283 1.752-.851.374-.567.561-1.406.561-2.517v-.068c0-1.134-.187-1.991-.561-2.569-.374-.579-.958-.868-1.752-.868-.567 0-1.027.114-1.378.34-.34.216-.59.573-.749 1.072-.159.499-.238 1.174-.238 2.025v.068c0 .839.079 1.502.238 1.99.159.488.409.839.749 1.055.34.215.799.323 1.378.323zm14.222 1.242c-1.361 0-2.359-.374-2.995-1.123-.635-.76-.952-1.945-.952-3.555 0-1.599.317-2.779.952-3.539.647-.76 1.645-1.14 2.995-1.14 1.224 0 2.12.295 2.687.885.567.59.851 1.469.851 2.637h-1.531c0-.805-.148-1.384-.442-1.735-.284-.363-.806-.545-1.565-.545-.828 0-1.435.272-1.821.817-.385.533-.578 1.406-.578 2.62v.068c0 1.202.187 2.064.561 2.586.374.521.987.782 1.838.782.748 0 1.281-.187 1.599-.561.329-.386.493-.959.493-1.719h1.446c0 1.021-.289 1.866-.868 2.535-.578.658-1.468.987-2.67.987zm5.103-12.504h1.497v4.355h.119c.624-.805 1.565-1.208 2.824-1.208 1.86 0 2.79 1.015 2.79 3.045v6.108h-1.497v-6.005c0-.715-.159-1.208-.476-1.48-.318-.284-.777-.426-1.378-.426-.431 0-.828.108-1.191.323a2.229 2.229 0 00-.868.902c-.215.397-.323.862-.323 1.395v5.291h-1.497v-12.3zm11.886 12.504c-.771 0-1.458-.182-2.059-.544-.601-.363-.901-1.021-.901-1.974 0-1.145.51-1.928 1.531-2.347 1.021-.431 2.495-.647 4.423-.647v-.987c0-.521-.148-.918-.442-1.19-.295-.284-.828-.426-1.6-.426-.725 0-1.247.136-1.565.409a1.29 1.29 0 00-.459 1.003v.204h-1.446a2.745 2.745 0 01-.017-.374c0-.794.329-1.406.987-1.837.657-.431 1.536-.647 2.637-.647 1.111 0 1.956.233 2.534.698.579.465.868 1.123.868 1.973v4.849c0 .204.057.357.17.459a.658.658 0 00.425.136h.681v.97c-.295.136-.681.204-1.157.204-.386 0-.709-.114-.97-.34a1.793 1.793 0 01-.527-.936h-.119c-.306.42-.726.749-1.259.987-.522.238-1.1.357-1.735.357zm.391-1.242c.442 0 .862-.091 1.259-.272.397-.182.72-.448.97-.8.249-.363.374-.799.374-1.31v-.646c-1.463 0-2.563.119-3.3.357-.726.227-1.089.664-1.089 1.31 0 .488.147.839.442 1.055.306.204.754.306 1.344.306zm6.629-7.911h1.14l.17 1.208h.119c.658-.941 1.662-1.412 3.011-1.412.896 0 1.582.244 2.059.732.487.476.731 1.247.731 2.313v6.108h-1.497v-6.005c0-.715-.159-1.208-.476-1.48-.318-.284-.777-.426-1.378-.426-.431 0-.828.108-1.191.323a2.229 2.229 0 00-.868.902c-.215.397-.323.862-.323 1.395v5.291h-1.497v-8.949zm9.453 0h1.14l.17 1.208h.119c.658-.941 1.662-1.412 3.011-1.412.896 0 1.582.244 2.059.732.487.476.731 1.247.731 2.313v6.108h-1.497v-6.005c0-.715-.159-1.208-.476-1.48-.318-.284-.777-.426-1.378-.426-.431 0-.828.108-1.191.323a2.229 2.229 0 00-.868.902c-.215.397-.323.862-.323 1.395v5.291h-1.497v-8.949zm13.247 9.153c-1.441 0-2.512-.38-3.216-1.14-.703-.76-1.054-1.939-1.054-3.538 0-1.599.351-2.779 1.054-3.539.704-.76 1.775-1.14 3.216-1.14 1.293 0 2.257.346 2.892 1.038.646.681.969 1.781.969 3.3v.749h-6.583c.056 1.032.3 1.798.731 2.297.443.487 1.106.731 1.991.731.714 0 1.293-.164 1.735-.493.442-.329.663-.834.663-1.514h1.463c0 1.043-.363 1.848-1.088 2.415-.715.556-1.639.834-2.773.834zm2.296-5.512c0-1.735-.765-2.603-2.296-2.603-.851 0-1.492.204-1.923.613-.419.408-.675 1.071-.765 1.99h4.984zm3.363-6.992h1.497v12.3h-1.497v-12.3zm6.833 12.504c-.828 0-1.519-.119-2.075-.357-.545-.25-.947-.573-1.208-.97a2.307 2.307 0 01-.391-1.293v-.272a.958.958 0 00.017-.102h1.48v.17c0 .533.21.936.629 1.208.42.261.964.391 1.633.391.579 0 1.055-.113 1.429-.34.386-.238.579-.567.579-.987 0-.329-.108-.595-.323-.799a2.124 2.124 0 00-.8-.494 10.928 10.928 0 00-1.293-.391c-.658-.17-1.196-.34-1.616-.51a2.91 2.91 0 01-1.055-.749c-.283-.34-.425-.777-.425-1.31 0-.782.317-1.401.953-1.854.646-.465 1.514-.698 2.602-.698.681 0 1.271.114 1.77.341.499.215.873.51 1.122.884.261.363.392.771.392 1.225l-.017.323h-1.463v-.153c0-.397-.159-.726-.477-.987-.306-.26-.805-.391-1.497-.391-.68 0-1.157.125-1.429.374-.272.239-.408.517-.408.834 0 .261.096.476.289.647.193.17.431.306.715.408.283.102.68.215 1.191.34.703.182 1.275.363 1.718.544.442.171.816.437 1.123.8.317.352.476.822.476 1.412 0 .919-.335 1.61-1.004 2.075-.658.454-1.537.681-2.637.681z"
      fill="#8AF1FF"
    />
    <circle cx="401.599" cy="317.356" r="5.431" fill="#7E0CF5" />
    <path
      d="M206.504 98.146V88.119c0-.617.506-1.119 1.129-1.119s1.129.502 1.129 1.119v10.027c0 .617-.506 1.118-1.129 1.118-.584 0-1.129-.501-1.129-1.118zm12.921.424l-4.903-7.752v7.328c0 .617-.506 1.118-1.129 1.118a1.124 1.124 0 01-1.129-1.118v-9.719c0-.81.662-1.504 1.518-1.504h.078c.506 0 1.012.27 1.284.695l4.865 7.635v-7.211c0-.617.506-1.119 1.129-1.119.622 0 1.128.502 1.128 1.119v9.718c0 .81-.661 1.504-1.517 1.504-.545 0-1.051-.231-1.324-.694zm10.703-9.487v9.178c0 .579-.467 1.042-1.051 1.042h-.156c-.583 0-1.05-.463-1.05-1.041v-9.179h-2.608a1.042 1.042 0 110-2.083h7.511a1.042 1.042 0 110 2.083h-2.646zm5.487 9.178V87.965c0-.54.468-1.003 1.012-1.003h6.811c.545 0 1.012.463 1.012 1.003 0 .54-.467 1.002-1.012 1.002h-5.565v2.854h4.787c.545 0 1.012.463 1.012 1.003 0 .54-.467 1.002-1.012 1.002h-4.787v3.356h5.565c.545 0 1.012.462 1.012 1.002s-.467 1.003-1.012 1.003h-6.811c-.544.077-1.012-.347-1.012-.925zm18.37.348l-1.79-3.973h-2.763v3.548c0 .617-.506 1.119-1.129 1.119h-.039a1.125 1.125 0 01-1.129-1.119V88.12c0-.617.506-1.119 1.129-1.119h4.125c2.958 0 4.32 1.852 4.32 3.818 0 1.659-.895 2.931-2.257 3.433l1.557 3.47a1.096 1.096 0 01-1.012 1.543c-.428 0-.856-.231-1.012-.655zm-1.557-9.68h-2.957v3.663h2.996c1.285 0 2.024-.655 2.024-1.812-.039-.964-.778-1.851-2.063-1.851zm15.023 9.101a5.065 5.065 0 01-3.542 1.466c-1.323 0-2.568-.425-3.502-1.389-1.363-1.35-1.557-2.97-1.557-4.975 0-2.005.194-3.663 1.557-4.975.934-.925 2.179-1.388 3.502-1.388 1.324 0 2.608.501 3.542 1.427.311.347.584.694.778 1.118.351.733-.194 1.543-1.012 1.543-.467 0-.856-.27-1.05-.694-.078-.232-.234-.424-.39-.617-.389-.502-1.089-.772-1.868-.772-.7 0-1.401.309-1.907.81-.856.887-.856 2.391-.856 3.548 0 1.119 0 2.661.856 3.548.506.502 1.207.81 1.907.81.779 0 1.479-.27 1.868-.771.156-.193.312-.424.39-.656.155-.424.583-.694 1.05-.694.818 0 1.363.81 1.012 1.543-.194.424-.467.81-.778 1.118zm12.104.077c-.934.926-2.258 1.389-3.581 1.389s-2.607-.463-3.58-1.389c-1.363-1.35-1.557-2.97-1.557-4.975 0-2.005.233-3.663 1.557-4.975.934-.925 2.257-1.388 3.58-1.388s2.608.463 3.581 1.388c1.362 1.35 1.556 2.97 1.556 4.975.039 2.006-.194 3.664-1.556 4.975zm-1.596-8.484a2.854 2.854 0 00-1.946-.81c-.701 0-1.479.308-1.946.81-.856.887-.895 2.39-.895 3.548 0 1.118.039 2.622.895 3.51.506.5 1.245.81 1.946.81.701 0 1.479-.31 1.946-.81.856-.888.895-2.392.895-3.51 0-1.157-.039-2.7-.895-3.548zm16.268 8.561V90.51l-2.919 7.829c-.156.462-.623.771-1.129.771s-.934-.309-1.128-.771l-2.919-7.945v7.79c0 .617-.506 1.08-1.09 1.08-.623 0-1.09-.501-1.09-1.08V88.66c0-.926.779-1.697 1.713-1.697h.155c.701 0 1.363.424 1.596 1.118l2.841 7.636 2.88-7.636a1.724 1.724 0 011.596-1.118c.934 0 1.712.771 1.712 1.697v9.525c0 .617-.506 1.08-1.089 1.08-.662 0-1.129-.463-1.129-1.08z"
      fill="#F5F3FF"
    />
    <path
      d="M221.605 108.453h1.497v12.3h-1.497v-12.3zm3.771 0h1.48v1.616h-1.48v-1.616zm0 3.352h1.497v8.948h-1.497v-8.948zm2.853 0h1.582l1.582 4.474c.227.635.522 1.571.885 2.807h.085c.329-1.168.618-2.104.867-2.807l1.566-4.474h1.497l-3.284 8.948h-1.497l-3.283-8.948zm13.218 9.152c-1.44 0-2.512-.38-3.215-1.14-.703-.76-1.055-1.939-1.055-3.538 0-1.599.352-2.779 1.055-3.539.703-.76 1.775-1.14 3.215-1.14 1.293 0 2.257.346 2.892 1.038.647.681.97 1.781.97 3.301v.748h-6.584c.057 1.032.301 1.798.732 2.297.442.487 1.106.731 1.99.731.715 0 1.293-.164 1.735-.493.443-.329.664-.834.664-1.514h1.463c0 1.043-.363 1.848-1.089 2.415-.714.556-1.639.834-2.773.834zm2.297-5.512c0-1.735-.766-2.603-2.297-2.603-.85 0-1.491.204-1.922.613-.42.408-.675 1.072-.766 1.99h4.985zm11.5 5.512c-1.361 0-2.359-.374-2.994-1.123-.635-.76-.953-1.945-.953-3.555 0-1.599.318-2.779.953-3.539.646-.76 1.644-1.14 2.994-1.14 1.225 0 2.121.295 2.688.885.567.59.85 1.469.85 2.637h-1.531c0-.805-.147-1.384-.442-1.735-.284-.363-.805-.545-1.565-.545-.828 0-1.435.273-1.821.817-.385.533-.578 1.406-.578 2.62v.068c0 1.202.187 2.064.561 2.586.375.521.987.782 1.838.782.748 0 1.281-.187 1.599-.561.329-.386.493-.959.493-1.718h1.446c0 1.02-.289 1.865-.867 2.534-.579.658-1.469.987-2.671.987zm5.103-12.504h1.497v4.355h.119c.624-.805 1.566-1.208 2.824-1.208 1.86 0 2.79 1.016 2.79 3.046v6.107h-1.497v-6.005c0-.715-.158-1.208-.476-1.48-.317-.284-.777-.426-1.378-.426-.431 0-.828.108-1.191.324a2.211 2.211 0 00-.867.901c-.216.397-.324.862-.324 1.395v5.291h-1.497v-12.3zm11.886 12.504c-.771 0-1.457-.181-2.058-.544-.602-.363-.902-1.021-.902-1.974 0-1.145.51-1.928 1.531-2.347 1.021-.431 2.495-.647 4.423-.647v-.987c0-.521-.147-.918-.442-1.19-.295-.284-.828-.426-1.599-.426-.726 0-1.248.136-1.565.409-.307.272-.46.606-.46 1.003v.204h-1.446a2.745 2.745 0 01-.017-.374c0-.794.329-1.406.987-1.837.658-.431 1.537-.647 2.637-.647 1.111 0 1.956.233 2.535.698.578.465.867 1.123.867 1.973v4.849c0 .204.057.357.17.459a.661.661 0 00.426.136h.68v.97c-.295.136-.68.204-1.157.204-.385 0-.709-.113-.969-.34a1.783 1.783 0 01-.528-.936h-.119c-.306.42-.726.749-1.259.987a4.13 4.13 0 01-1.735.357zm.391-1.242c.443 0 .862-.091 1.259-.272a2.38 2.38 0 00.97-.8c.249-.362.374-.799.374-1.309v-.647c-1.463 0-2.563.119-3.3.357-.726.227-1.089.664-1.089 1.31 0 .488.147.839.442 1.055.307.204.755.306 1.344.306zm8.654 1.225c-.613 0-1.061-.181-1.344-.544-.284-.363-.426-.811-.426-1.344v-6.006h-1.088v-1.241h1.105l.324-2.484h1.157v2.484h1.514v1.241h-1.514v5.87c0 .533.249.799.748.799h.766v.987a2.543 2.543 0 01-.579.17 3.586 3.586 0 01-.663.068z"
      fill="#8AF1FF"
    />
    <circle cx="251.896" cy="65.184" r="5.431" fill="#FF7315" />
    <path
      d="M111.504 351.631a4.453 4.453 0 003.21-1.253l1.584 1.714c-1.051 1.079-2.505 1.886-4.766 1.886-3.887 0-6.392-2.577-6.392-6.061 0-3.456 2.635-6.062 6.032-6.062 3.859 0 6.033 2.937 5.846 6.997h-9.099c.316 1.699 1.511 2.779 3.585 2.779zm2.764-4.708c-.245-1.569-1.181-2.735-3.067-2.735-1.756 0-2.966.993-3.282 2.735h6.349zm-62.556 4.578l7.012-7.126H51.87v-2.232h10.092v2.289l-6.997 7.113h7.098v2.231H51.712v-2.275zm18.213.13a4.453 4.453 0 003.21-1.253l1.584 1.714c-1.051 1.079-2.505 1.886-4.765 1.886-3.873 0-6.393-2.577-6.393-6.061 0-3.456 2.635-6.062 6.033-6.062 3.858 0 6.032 2.937 5.845 6.997h-9.1c.332 1.699 1.513 2.779 3.586 2.779zm2.778-4.708c-.244-1.569-1.18-2.735-3.066-2.735-1.757 0-2.966.993-3.283 2.735h6.35zm17.882 1.008c0-3.729 2.778-6.047 5.845-6.047 1.54 0 3.009.677 3.873 1.742v-6.867h2.476v16.988h-2.476v-1.612c-.893 1.137-2.362 1.843-3.902 1.843-2.966 0-5.816-2.347-5.816-6.047zm9.862-.029c0-2.073-1.57-3.772-3.686-3.772-2.073 0-3.686 1.656-3.686 3.772 0 2.117 1.613 3.787 3.686 3.787 2.116.014 3.686-1.685 3.686-3.787zm18.183 3.369l2.246-1.166a3.333 3.333 0 002.995 1.699c1.396 0 2.13-.72 2.13-1.541 0-.936-1.353-1.137-2.821-1.439-1.987-.418-4.046-1.066-4.046-3.47 0-1.843 1.756-3.542 4.506-3.513 2.174 0 3.787.864 4.694 2.26l-2.088 1.152c-.533-.821-1.454-1.324-2.62-1.324-1.339 0-2.016.647-2.016 1.396 0 .835 1.08 1.065 2.765 1.44 1.914.417 4.088 1.051 4.088 3.469 0 1.613-1.396 3.772-4.722 3.744-2.419 0-4.132-.979-5.111-2.707zm16.557-2.692l-1.958 2.145v3.023h-2.477v-16.988h2.477v11.114l5.255-5.758h3.009l-4.55 4.981 4.679 6.651h-2.807l-3.628-5.168zm-52.089-6.709c-2.951 0-5.413 1.915-5.413 5.068v6.809h2.534v-6.478c0-1.915 1.094-3.053 2.965-3.053 1.872 0 2.808 1.138 2.808 3.053v6.478h2.52v-6.795c0-3.167-2.463-5.082-5.414-5.082z"
      fill="#F5F3FF"
    />
    <path
      d="M39.332 375.624c-.613 0-1.06-.182-1.344-.545-.284-.363-.425-.811-.425-1.344v-6.005h-1.09v-1.242h1.107l.323-2.484h1.157v2.484h1.514v1.242H39.06v5.869c0 .533.249.8.748.8h.766v.986a2.52 2.52 0 01-.579.171c-.238.045-.46.068-.663.068zm2.71-12.487h1.48v1.616h-1.48v-1.616zm0 3.351h1.497v8.949h-1.497v-8.949zm7.174 9.153c-1.361 0-2.36-.375-2.994-1.123-.636-.76-.953-1.945-.953-3.556 0-1.599.318-2.778.953-3.538.646-.76 1.644-1.14 2.994-1.14 1.225 0 2.12.295 2.688.885.567.589.85 1.468.85 2.637h-1.53c0-.806-.148-1.384-.443-1.736-.284-.363-.805-.544-1.565-.544-.828 0-1.435.272-1.82.817-.386.533-.579 1.406-.579 2.619v.068c0 1.203.187 2.065.561 2.586.375.522.987.783 1.838.783.748 0 1.281-.187 1.599-.562.329-.385.493-.958.493-1.718h1.446c0 1.021-.289 1.866-.867 2.535-.579.658-1.47.987-2.671.987zm5.103-12.504h1.497v7.74l3.794-4.389h1.854l-3.079 3.522 3.25 5.427h-1.736l-2.45-4.356-1.633 1.549v2.807H54.32v-12.3zm12.3 12.504c-1.44 0-2.512-.38-3.215-1.14-.703-.76-1.055-1.94-1.055-3.539 0-1.599.352-2.778 1.055-3.538.703-.76 1.775-1.14 3.215-1.14 1.293 0 2.257.346 2.892 1.038.647.68.97 1.78.97 3.3v.749h-6.584c.057 1.032.3 1.797.732 2.296.442.488 1.105.732 1.99.732.715 0 1.293-.165 1.735-.494.442-.328.664-.833.664-1.514h1.463c0 1.044-.363 1.849-1.089 2.416-.715.556-1.639.834-2.773.834zm2.297-5.512c0-1.735-.766-2.603-2.297-2.603-.85 0-1.491.204-1.922.612-.42.409-.675 1.072-.766 1.991h4.985zm5.387 5.495c-.613 0-1.06-.182-1.344-.545-.284-.363-.425-.811-.425-1.344v-6.005h-1.09v-1.242h1.106l.324-2.484h1.157v2.484h1.514v1.242H74.03v5.869c0 .533.249.8.748.8h.766v.986a2.52 2.52 0 01-.579.171c-.238.045-.46.068-.663.068zm2.71-12.487h1.48v1.616h-1.48v-1.616zm0 3.351h1.497v8.949h-1.497v-8.949zm3.771 0h1.14l.17 1.208h.12c.657-.941 1.66-1.412 3.01-1.412.896 0 1.582.244 2.059.732.488.476.731 1.247.731 2.313v6.108h-1.497v-6.006c0-.714-.158-1.208-.476-1.48-.317-.283-.777-.425-1.378-.425-.43 0-.828.108-1.19.323a2.22 2.22 0 00-.868.902c-.216.397-.324.862-.324 1.395v5.291h-1.497v-8.949zm11.052 12.045c-.657 0-1.23-.17-1.718-.511-.476-.329-.714-.879-.714-1.65 0-.93.482-1.565 1.446-1.905a2.21 2.21 0 01-.68-.562 1.368 1.368 0 01-.256-.816c0-.442.153-.777.46-1.004a2.977 2.977 0 011.037-.476 2.996 2.996 0 01-.885-1.004 2.7 2.7 0 01-.323-1.31c0-.952.323-1.69.97-2.211.646-.533 1.531-.8 2.654-.8.624 0 1.19.102 1.701.306.737-.351 1.168-.867 1.293-1.548h1.429c0 .533-.159.993-.476 1.378-.307.386-.726.641-1.26.766.636.567.953 1.27.953 2.109 0 .953-.329 1.696-.986 2.229-.647.521-1.531.782-2.654.782h-1.43c-.305 0-.544.068-.714.204a.664.664 0 00-.238.528c0 .215.08.391.238.527.17.136.409.204.715.204h3.59c.703 0 1.258.216 1.666.647.409.419.613.93.613 1.531 0 .431-.096.845-.29 1.242-.192.397-.504.72-.935.969-.42.25-.953.375-1.6.375h-3.606zm2.008-7.384c.703 0 1.236-.158 1.599-.476.363-.329.544-.788.544-1.378 0-.59-.181-1.043-.544-1.361-.363-.329-.896-.493-1.6-.493-.702 0-1.235.164-1.598.493-.363.318-.545.771-.545 1.361s.182 1.049.545 1.378c.363.318.896.476 1.599.476zm1.633 6.176c.374 0 .686-.102.936-.306.25-.205.374-.477.374-.817 0-.34-.102-.607-.306-.8-.193-.204-.454-.306-.783-.306h-3.725c-.33 0-.59.102-.783.306-.193.193-.29.46-.29.8s.097.612.29.817c.193.204.454.306.782.306h3.505zm12.01-1.684c-.828 0-1.52-.119-2.075-.358-.545-.249-.947-.572-1.208-.969a2.307 2.307 0 01-.391-1.293v-.272a.958.958 0 00.017-.102h1.48v.17c0 .533.209.935.629 1.208.42.26.964.391 1.633.391.579 0 1.055-.114 1.429-.34.386-.239.579-.568.579-.987 0-.329-.108-.596-.324-.8a2.118 2.118 0 00-.799-.493 10.928 10.928 0 00-1.293-.391 13.167 13.167 0 01-1.616-.511 2.895 2.895 0 01-1.055-.748c-.283-.34-.425-.777-.425-1.31 0-.783.317-1.401.952-1.854.647-.465 1.515-.698 2.603-.698.681 0 1.271.113 1.77.34.499.216.873.511 1.122.885.261.363.392.771.392 1.225l-.017.323h-1.463v-.153c0-.397-.159-.726-.477-.987-.306-.261-.805-.391-1.497-.391-.68 0-1.157.125-1.429.374-.272.238-.408.516-.408.834 0 .261.096.476.289.646.193.17.431.306.715.409.283.102.68.215 1.19.34.704.181 1.276.363 1.719.544.442.17.816.437 1.122.8.318.351.477.822.477 1.412 0 .918-.335 1.61-1.004 2.075-.658.454-1.537.681-2.637.681zm6.295 2.892c-.499 0-.896-.046-1.191-.136v-.97h.595c1.157 0 1.917-.664 2.28-1.99l-3.454-8.949h1.583l1.667 4.474c.238.635.561 1.571.969 2.807h.085c.329-1.156.607-2.092.834-2.807l1.429-4.474h1.497l-2.943 8.489c-.397 1.134-.851 2.008-1.361 2.62-.499.624-1.162.936-1.99.936zm10.717-2.892c-.828 0-1.52-.119-2.075-.358-.545-.249-.947-.572-1.208-.969a2.307 2.307 0 01-.391-1.293v-.272a.958.958 0 00.017-.102h1.48v.17c0 .533.209.935.629 1.208.42.26.964.391 1.633.391.579 0 1.055-.114 1.429-.34.386-.239.579-.568.579-.987 0-.329-.108-.596-.324-.8a2.118 2.118 0 00-.799-.493 10.928 10.928 0 00-1.293-.391 13.167 13.167 0 01-1.616-.511 2.895 2.895 0 01-1.055-.748c-.283-.34-.425-.777-.425-1.31 0-.783.317-1.401.952-1.854.647-.465 1.515-.698 2.603-.698.681 0 1.271.113 1.77.34.499.216.873.511 1.122.885.261.363.392.771.392 1.225l-.017.323h-1.463v-.153c0-.397-.159-.726-.477-.987-.306-.261-.805-.391-1.497-.391-.68 0-1.157.125-1.429.374-.272.238-.408.516-.408.834 0 .261.096.476.289.646.193.17.431.306.715.409.283.102.68.215 1.19.34.704.181 1.276.363 1.719.544.442.17.816.437 1.122.8.318.351.477.822.477 1.412 0 .918-.335 1.61-1.004 2.075-.658.454-1.537.681-2.637.681zm7.468-.017c-.612 0-1.06-.182-1.343-.545-.284-.363-.426-.811-.426-1.344v-6.005h-1.089v-1.242h1.106l.323-2.484h1.157v2.484h1.514v1.242h-1.514v5.869c0 .533.25.8.749.8h.765v.986c-.147.069-.34.125-.578.171a3.588 3.588 0 01-.664.068zm6.505.017c-1.441 0-2.513-.38-3.216-1.14-.703-.76-1.054-1.94-1.054-3.539 0-1.599.351-2.778 1.054-3.538.703-.76 1.775-1.14 3.216-1.14 1.292 0 2.256.346 2.892 1.038.646.68.969 1.78.969 3.3v.749h-6.583c.056 1.032.3 1.797.731 2.296.442.488 1.106.732 1.991.732.714 0 1.292-.165 1.735-.494.442-.328.663-.833.663-1.514h1.463c0 1.044-.363 1.849-1.089 2.416-.714.556-1.638.834-2.772.834zm2.296-5.512c0-1.735-.765-2.603-2.296-2.603-.851 0-1.492.204-1.923.612-.419.409-.675 1.072-.765 1.991h4.984zm3.363-3.641h1.14l.17 1.208h.119c.612-.941 1.508-1.412 2.688-1.412 1.157 0 1.928.471 2.313 1.412h.102c.307-.454.704-.8 1.191-1.038a3.5 3.5 0 011.582-.374c1.758 0 2.637.902 2.637 2.705v6.448h-1.497v-6.176c0-.646-.142-1.094-.425-1.344-.284-.261-.675-.391-1.174-.391-.601 0-1.106.238-1.514.714-.408.477-.612 1.112-.612 1.906v5.291h-1.497v-6.176c0-.646-.137-1.094-.409-1.344-.272-.261-.658-.391-1.157-.391a1.92 1.92 0 00-1.071.323c-.329.204-.596.505-.8.902-.193.397-.289.862-.289 1.395v5.291h-1.497v-8.949z"
      fill="#8AF1FF"
    />
    <circle cx="96.667" cy="317.356" r="5.431" fill="#FE346E" />
    <defs>
      <clipPath id="clip0">
        <path fill="#fff" transform="translate(234.542 215.297)" d="M0 0h36.391v43.406H0z" />
      </clipPath>
      <clipPath id="clip1">
        <path fill="#fff" transform="translate(234.542 215.297)" d="M0 0h36.391v43.406H0z" />
      </clipPath>
      <clipPath id="clip2">
        <path fill="#fff" transform="translate(193.224 271.988)" d="M0 0h118.582v24.414H0z" />
      </clipPath>
      <clipPath id="clip3">
        <path fill="#fff" transform="translate(193.224 271.988)" d="M0 0h118.582v24.414H0z" />
      </clipPath>
    </defs>
  </svg>
);

const Avatar: React.FC<{
  url?: ImageMetadata | string;
  name?: string;
  size?: number;
  className?: string;
  bgClassName?: string;
}> = ({ url, name, size = 40, className, bgClassName }) => {
  return (
    <div
      className={classNames("flex items-center justify-center", bgClassName || "bg-gray-300")}
      style={{
        width: `${size}px`,
        minWidth: `${size}px`,
        height: `${size}px`,
        maskImage: `url(${UserMask})`,
        maskRepeat: "no-repeat",
        maskSize: "cover",
        WebkitMaskImage: `url(${UserMask})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "cover",
      }}
    >
      <img
        loading="lazy"
        alt={name}
        className={className}
        src={url ? fixType(url) : UserDefault}
        width={url ? size : undefined}
        height={url ? size : undefined}
      />
    </div>
  );
};
