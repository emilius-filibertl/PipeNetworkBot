import axios from "axios";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";

import { readProxy } from "./readConfig.js";
import { nodeInfo } from "./nodeInfo.js";

const { green, red } = chalk;

const retry = async (retryCount) => {
  console.log(
    red(`Wait 2.5 seconds before retrying... (Retry #${retryCount})\n`)
  );

  // Delay 2.5 second
  await new Promise((resolve) => setTimeout(resolve, 2500));
};

const sendTestResult = async (token) => {
  const maxRetries = 5;
  let retryCount = 0;

  let node = null;

  while (retryCount < maxRetries && !node) {
    node = await nodeInfo(token);

    if (!node) {
      // Delay 2.5 second
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }

  if (!node) {
    console.log(red("Unable to retrieve nodeInfo data. Giving up :(\n"));
    return;
  }

  const payload = {
    node_id: node.node_id,
    ip: node.ip,
    latency: Math.floor(Math.random() * 5) + 1,
    status: "online",
  };

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const { username, password, hostname, port } = await readProxy();

  const proxy = `http://${username}:${password}@${hostname}:${port}`;

  const proxyAgent = new HttpsProxyAgent(proxy);

  retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const response = await axios.post(
        "https://api.pipecdn.app/api/test",
        payload,
        {
          headers: headers,
          httpsAgent: proxyAgent,
        }
      );

      const { status, data } = response;

      if (status === 201) {
        console.log(green("Success\n"));
        return;
      } else {
        // Error response 2xx
        console.log(red(`Error encountered during sendTestResult:`));
        console.log(red(`Status: ${status}`));
        console.log(red(`Message: ${data?.message || "Unknown error"}`));

        await retry(++retryCount);
      }
    } catch (error) {
      // Error response 4xx and 5xx etc
      console.log(red(`Error encountered during sendTestResult:`));

      if (error.response) {
        const { status, data } = error.response;

        // Response from server, handle error response status
        if (status === 401 || status === 403) {
          console.log(red(`Authentication Error: ${status}`));
          console.log(red(`Please check your token or credentials.\n`));
          // Stop retrying after authentication error
          return;
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
};

export { sendTestResult };
