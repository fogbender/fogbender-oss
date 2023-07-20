---
title: "Generating bot prompt instructions with ChatGPT"
description: "Generating Fogbender chatbot prompt instructions with ChatGPT"
publishDate: "January 23, 2023"
authors:
  - andrei
socialImage: "/assets/blog/generating-bot-prompt-instructions-with-chatgpt/social.png"
coverImageAspectRatio: "240:53"
thumbnailImage: "/assets/blog/generating-bot-prompt-instructions-with-chatgpt/thumb.png"
coverImage: "/assets/blog/generating-bot-prompt-instructions-with-chatgpt/cover.png"
hidden: false
lang: "en"
---

<div className="flex justify-center">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/HYxVYoLYlMQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

If you have a scenario where you need to have your customer answer a standard set of questions, one way to do this is with a chatbot.

For example, say you're a customer-facing agent working at a company that manufactures spacesuits. Below is a hypothetical conversation you might have with a customer:

<br />

<table>
  <tr>
    <td className="font-bold">Customer</td>
    <td>Heya, I need a spacesuit</td>
  </tr>
  <tr>
    <td className="font-bold">You</td>
    <td>Great, we'd love to help. May I have our chatbot ask you a few standard questions, so we can get started?</td>
  </tr>
  <tr>
    <td className="font-bold">Customer</td>
    <td>Of course!</td>
  </tr>
  <tr>
    <td className="font-bold">You</td>
    <td><span className="text-gray-500">@SpaceSuitor</span> request suit details</td>
  </tr>
  <tr>
    <td className="font-bold">SpaceSuitor</td>
    <td>$$$ Hello! What is your height?</td>
  </tr>
  <tr>
    <td className="font-bold">Customer</td>
    <td>110cm</td>
  </tr>
  <tr>
    <td className="font-bold">SpaceSuitor</td>
    <td>What is your weight?</td>
  </tr>
  <tr>
    <td className="font-bold">Customer</td>
    <td>60kg</td>
  </tr>
  <tr>
    <td className="font-bold">SpaceSuitor</td>
    <td>Are you right-handed?</td>
  </tr>
  <tr>
    <td className="font-bold">Customer</td>
    <td>no</td>
  </tr>
  <tr>
    <td className="font-bold">SpaceSuitor</td>
    <td>Are you planning any long-range spacewalks?</td>
  </tr>
  <tr>
    <td className="font-bold">Customer</td>
    <td>yes</td>
  </tr>
  <tr>
    <td className="font-bold">SpaceSuitor</td>
    <td>Are you planning on carrying weapons?</td>
  </tr>
  <tr>
    <td className="font-bold">Customer</td>
    <td>yes</td>
  </tr>
  <tr>
    <td className="font-bold">SpaceSuitor</td>
    <td>Thank you! $$$</td>
  </tr>
  <tr>
    <td className="font-bold">You</td>
    <td>Thanks for this - our next printing cycle starts in two hours, so you can pick up your spacesuit this afternoon.</td>
  </tr>
  <tr>
    <td className="font-bold">Customer</td>
    <td>Is a delivery option available?</td>
  </tr>
  <tr>
    <td className="font-bold">You</td>
    <td>Of course! Mind if I have our bot collect delivery details?</td>
  </tr>
  <tr>
    <td className="font-bold">Customer</td>
    <td>No problem</td>
  </tr>
  <tr>
    <td className="font-bold">You</td>
    <td><span className="text-gray-500">@SpaceSuitor</span> request delivery details</td>
  </tr>
  <tr>
    <td className="font-bold">SpaceSuitor</td>
    <td>$$$ Hello! What is your layer and quadrant?</td>
  </tr>
  <tr>
    <td>...</td>
    <td>...</td>
  </tr>
</table>

To configure such a chatbot with Fogbender, you’ll need two things:

1. A ChatGPT account - you can create one here: [https://chat.openai.com/chat](https://chat.openai.com/chat)

2. A script with a list of questions that follow the rules below:

   - Branching via “yes” and “no” answers only. For example, in the dialogue above, if the Customer answered “left” to the question “Are you right-handed?”, the bot would have replied “Sorry, I don’t understand ‘left’. I only understand ‘yes’ and ‘no’.”
   - If you expect a multi-message answer to a particular question, you can indicate this in parentheses, along with a list of words the bot would use to move onto the next question (see example below)
   - We use multiples of `=` instead of the more common `-` in conjunction with tabs/indentation to indicate nesting because many word editors turn consecutive `--` characters into m-dashes and because indentation may get collapsed during copy-pasting

Please use the following script as a model for yours:

```
= What's your name?
= What year were you born?
= What are the cities and countries where you lived for more than a year? (Can have multiple responses; stop word: next, continue, or done)
= Do you like films?
= (if yes:)
  == What are some of your favorite films? (Can have multiple responses; stop word: next)
= (if no:)
  == How come? (Can have multiple responses; stop word: next)
  == Do you know anyone else who doesn't like films?
= Do you play any musical instruments?
= (if yes:)
  == Which ones? (Can have multiple responses; stop word: next)
= (if no:)
  == Did you ever want to play one?
  == (if yes:)
    === Which one?
= Do you have a favorite non-dessert food?
= (if no:)
  == How about a favorite non-dessert beverage?
  == (if yes:)
    === Which one?
= What's your second favorite US state?
```

Once you've got your script ready:

1. Enable and name your bot in the [Fogbender ai settings tab](https://fogbender.com/admin/-/-/settings/ai)
2. While there, add a new prompt and give your command a name (e.g. "request suit details" in first example)
3. Paste the ChatGPT instructions (below) to a new text document
4. Replace `PASTE YOUR SCRIPT HERE` in the instructions (below) with your script
5. Start a new ChatGPT chat, paste instructions, wait for ChatGPT to generate the JSON, copy the JSON
6. In Fogbender ai settings, paste the JSON into the "Instructions" textarea of your bot prompt

(NOTE: the JSON that ChatGPT produces might be malformatted - if that's the case,click "Prettify JSON" in Fogbender after pasting)

```
Consider the following set of questions:

Questions set 1: ###
= What is the OS of your device or system?
= Which device are you using?
= What is the Fogbender SDK version that are you using?
= Do you have a URL of a video showing the problem?
= (if yes:)
 == What is the URL?
= (if no:)
  == Please provide a clear and concise description of what you expected to happen. (Can have multiple responses; stop word: next)
  == Please provide a clear and concise description of what's currently happening. (Can have multiple responses; stop word: next)
  == Please provide the steps to reproduce the behavior. (Can have multiple responses; stop word: next)
= Did you try kicking a tire?
= (if yes:)
  == Which tire?
= (if no:)
  == Would you mind giving kicking a tire a shot?
  == (if yes:)
    === Make sure to kick the rear right one
= Do you have any additional commentary or context that you would like to provide about the problem? (Can have multiple responses; stop word: next or no)
###

And the corresponding JSON structure:

JSON: ###
[
  {
    "question_id": 0,
    "question_text": "What is the OS of your device or system?"
  },
  {
    "question_id": 1,
    "question_text": "Which device are you using?"
  },
  {
    "question_id": 2,
    "question_text": "What is the Fogbender SDK version that are you using"
  },
  {
    "question_id": 3,
    "question_text": "Do you have a URL of a video showing the problem?",
    "on_affirmative": [
      {
        "question_id": 4,
        "question_text": "What is the URL?"
      }
    ],
    "on_negative": [
      {
        "question_id": 5,
        "question_text": "Please provide a clear and concise description of what you expected to happen.",
	      "stop_words": ["next"]
      },
      {
        "question_id": 6,
        "question_text": "Please provide a clear and concise description of what's currently happening.",
        "stop_words": ["next"]
      },
      {
        "question_id": 7,
        "question_text": "Please provide the steps to reproduce the behavior.",
        "stop_words": ["next"]
      }
    ]
  },
  {
    "question_id": 8,
    "question_text": "Did you try kicking a tire?",
    "on_affirmative": [
      {
        "question_id": 9,
        "question_text": "Which tire?"
      }
    ],
    "on_negative": [
      {
        "question_id": 10,
        "question_text": "Would you mind giving kicking a tire a shot?",
        "on_affirmative": [
          "question_id": 11,
          "question_text": "Make sure to kick the rear right one"
        ]
      }
    ],
  },
  {
    "question_id": 11,
    "question_text": "Do you have any additional commentary or context that you would like to provide about the problem?",
    "stop_words": ["next", "no"]
  }
]
###

Can you build a similar JSON structure (with pretty formatting) for the following questions?

Questions set 2: ###
	PASTE YOUR SCRIPT HERE
###

```
