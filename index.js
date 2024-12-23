import chalk from "chalk";

import { readAccounts } from "./src/readConfig.js";
import { sendHeartbeat } from "./src/sendHeartbeat.js";
import { sendTestResult } from "./src/sendTestResult.js";
import { pointInfo } from "./src/pointInfo.js";

const { green, yellow, cyan, red } = chalk;

const equals = "=".repeat(150);
const dash = "-".repeat(150);

const getRandomDelay = () => {
  const minDelay = 15 * 60 * 1000; // 15 Minutes
  const maxDelay = 20 * 60 * 1000; // 20 Minutes
  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
};

const runSession = async () => {
  let session = 1;

  let elapsedTime = 0;

  const accounts = await readAccounts();

  while (true) {
    console.log(equals);
    console.log(green(`Starting session ${session}... `));

    const randomDelay = getRandomDelay();

    elapsedTime += randomDelay;

    for (const account of accounts) {
      console.log(dash);

      const { email, token } = account;

      console.log(yellow(`Running for email: ${cyan(email)}\n`));

      console.log(yellow("Sending heartbeat?"));
      if (elapsedTime >= 6 * 60 * 60 * 1000 || session === 1) {
        await sendHeartbeat(token);
      } else {
        console.log(red("False\n"));
      }

      console.log(yellow(`Submitting test result...`));
      await sendTestResult(token);

      console.log(yellow("Summary..."));
      await pointInfo(token);
    }

    const temp = session + 1;

    const minute = Math.floor(randomDelay / 60000);

    const time = Math.floor(elapsedTime / 60000);

    console.log(dash);
    console.log(
      green(
        `End of session ${session} | Wait ${minute} minutes for the next session ${temp} | Stop code execution "Ctrl+c" | Elapsed: ${time} minutes`
      )
    );
    console.log(`${equals}\n`);

    session++;

    if (elapsedTime >= 6 * 60 * 60 * 1000) {
      elapsedTime = 0;
    }

    // Delay based on randomDelay
    await new Promise((resolve) => setTimeout(resolve, randomDelay));
  }
};

await runSession();
