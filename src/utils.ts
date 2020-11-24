import { Logger } from "log4js";
import fetch, {
  Response as NodeFetchResponse,
  RequestInit as NodeFetchRequestInit,
} from "node-fetch";

/**
 * @export
 * @param {number} time
 * @return {*}
 */
export async function sleep(time: number) {
  return new Promise<void>((resolve) => {
    setTimeout(function () {
      resolve();
    }, time);
  });
}

interface JDResponse {
  parsed_body: string;
  response: NodeFetchResponse;
  body_buffer: Buffer;
}

/**
 * 发送jd相关请求
 *
 * @return {*}
 */
export async function send_jd_request(
  url: string,
  options: NodeFetchRequestInit
): Promise<JDResponse> {
  const res = await fetch(url, options);

  return new Promise((resolve, reject) => {
    if (!res.ok) {
      reject(res);
    }

    let response_body = "";

    let response_buf = Buffer.alloc(0);

    res.body.on("data", function (d) {
      response_body += d.toString();
      response_buf = Buffer.concat([response_buf, d]);
    });

    res.body.on("end", function () {
      resolve({
        parsed_body: response_body,
        response: res,
        body_buffer: response_buf,
      });
    });
  });
}

interface WaitConfig {
  hour: number;
  minute?: number;
  target_date?: number;
  ahead_time?: number;
  logger: Logger;
}

const DEFAULT_AHEAD_TIME = 500;

export async function wait_for_start_time(config: WaitConfig): Promise<void> {
  const date = new Date();

  const ahead_time = config.ahead_time || DEFAULT_AHEAD_TIME;

  if (config.target_date) {
    date.setDate(config.target_date);
  }

  if (config.minute) {
    date.setMinutes(config.minute);
  } else {
    date.setMinutes(0);
  }

  date.setMilliseconds(0);
  date.setSeconds(0);

  date.setHours(config.hour);

  const now_date = new Date();
  const time_out = (date.getTime() - now_date.getTime());

  const log_msg = `目前时间：${now_date.toLocaleString()}，目标时间：${date.toLocaleString()}，将在${
    time_out - ahead_time
  }ms后开启轮训任务`;

  config.logger.debug(
    `目前时间：${now_date.toLocaleString()}，目标时间：${date.toLocaleString()}，将在${
      time_out - ahead_time
    }ms后开启轮训任务`
  );

  return new Promise((resolve) => {
    setTimeout(function () {
      resolve();
    }, time_out - ahead_time);
  });
}
