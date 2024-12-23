import axios from "axios";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";

import { readProxy } from "./readConfig.js";

const { red } = chalk;

const retry = async (retryCount) => {
  console.log(
    red(`Wait 2.5 seconds before retrying... (Retry #${retryCount})\n`)
  );

  // Delay 2.5 second
  await new Promise((resolve) => setTimeout(resolve, 2500));
};

const ipInfo = async () => {
  const { username, password, hostname, port } = await readProxy();

  const proxy = `http://${username}:${password}@${hostname}:${port}`;

  const proxyAgent = new HttpsProxyAgent(proxy);

  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const response = await axios.get("https://ipapi.co/json/", {
        httpsAgent: proxyAgent,
      });

      const { status, data } = response;

      if (status === 200) {
        const { city, region, country_name } = data;
        return `${city}, ${region}, ${country_name}`;
      } else {
        // Error response 2xx
        console.log(red(`Error encountered during ipInfo:`));
        console.log(red(`Status: ${status}`));
        console.log(red(`Message: ${data?.message || "Unknown error"}`));

        await retry(++retryCount);
      }
    } catch (error) {
      // Error response 4xx and 5xx etc
      console.log(red(`Error encountered during ipInfo:`));

      if (error.response) {
        const { status, data } = error.response;

        // Response from server, handle error response status
        if (status === 401 || status === 403) {
          console.log(red(`Authentication Error: ${status}`));
          console.log(red(`Please check your token or credentials.\n`));
          // Stop retrying after authentication error
          return null;
        }

        console.log(red(`Status: ${status}`));
        console.log(red(`Message: ${data?.message || "Unknown error"}`));
      } else {
        // Network or unknown error
        console.log(red(`Network or unknown error: ${error.message}`));
      }

      await retry(++retryCount);
    }
  }

  console.log(red(`Max retries reached. Giving up :(\n`));
  return null;
};

export { ipInfo };
