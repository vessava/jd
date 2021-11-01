import signale from "signale";
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

const DEFAULT_AHEAD_TIME = 900;

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
  const time_out = date.getTime() - now_date.getTime() - ahead_time;

  if (time_out < 0) {
    config.logger.info("立刻开始轮训");
    return Promise.resolve();
  }

  const log_msg = `目前时间：${now_date.toLocaleString()}，目标时间：${date.toLocaleString()}，将在${time_out}ms后开启轮训任务`;

  config.logger.info(log_msg);

  return new Promise((resolve) => {
    setTimeout(function () {
      resolve();
    }, time_out);
  });
}

export function querystring(obj: any) {
  const str = Object.keys(obj)
    .map((key) => {
      const val = obj[key];

      return `${key}=${get_qs_value(val)}`;
    })
    .join("&");

  return str;

  function get_qs_value(value: any) {
    if (typeof value === "object") {
      return encodeURIComponent(JSON.stringify(value));
    } else {
      if (typeof value === "number" && value > 1e20) {
        return toFixed(value);
      }
      return value;
    }
  }

  function toFixed(x: any) {
    if (Math.abs(x) < 1.0) {
      var e = parseInt(x.toString().split("e-")[1]);
      if (e) {
        x *= Math.pow(10, e - 1);
        x = "0." + new Array(e).join("0") + x.toString().substring(2);
      }
    } else {
      var e = parseInt(x.toString().split("+")[1]);
      if (e > 20) {
        e -= 20;
        x /= Math.pow(10, e);
        x += new Array(e + 1).join("0");
      }
    }
    return x;
  }
}

interface NewJDApiConfig {
  action_path: string;
  form_data: any;
  cookie: string;
}

export function send_new_jd_api_request(config: NewJDApiConfig) {
  const api =
    "https://cart.jd.com/" + config.action_path + "?rd" + Math.random();

  const body = config.form_data;

  const options = {
    body: querystring(body),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      cookie: config.cookie,
      origin: "https://cart.jd.com",
      referer: "https://cart.jd.com/cart.action",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36 Edg/87.0.664.41",
    },
    method: "POST",
  };

  return send_jd_request(api, options);
}

export interface JDApiConfig {
  user_key: string;
  area?: string;
  functionId: string;
  cookie: string;
  extend_data?: any;
}

export async function send_jd_api_request(config: JDApiConfig) {
  const url = "https://api.m.jd.com/api";

  const extend_data = config.extend_data || {};
  const data = {
    ...extend_data,
    serInfo: {
      area: config.area || "1_2800_2851_0",
      "user-key": config.user_key,
    },
  };

  const body = {
    functionId: config.functionId,
    appid: "JDC_mall_cart",
    body: {
      operations: [
        {
          TheSkus: [
            {
              Id: "100009216176",
              num: 1,
              skuUuid: "F1ZA4x1012023809578815488",
              useUuid: false,
            },
          ],
        },
      ],
      serInfo: {
        area: "1_72_55653_0",
        "user-key": "ecbddc0e-ab54-4d26-9dce-30ab263c99be",
      },
    },
  };

  const options = {
    body: querystring(body),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/plain, */*",
      cookie: config.cookie,
      origin: "https://cart.jd.com",
      referer: "https://cart.jd.com/",
      pragma: "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "no-cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
    },
    method: "POST",
  };

  return send_jd_request(url, options);
}

export class Logger {
  public info(msg: string) {
    // logger.info(chalk.blue(msg));
    signale.info(generate_time_log(msg));
  }

  public success(msg: string) {
    // logger.info(chalk.green(msg));
    signale.success(generate_time_log(msg));
  }

  public warn(msg: string) {
    signale.warn(generate_time_log(msg));
  }

  public error(msg: string) {
    // logger.info(chalk.red(msg));
    signale.fatal(generate_time_log(msg));
  }

  public start(msg: string) {
    signale.start(generate_time_log(msg));
  }

  public log(msg: string) {
    signale.log(generate_time_log(msg));
  }

  public complete(msg: string) {
    signale.complete(generate_time_log(msg));
  }
}

function generate_time_log(msg: string) {
  const date = new Date();
  const date_str = `${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;

  return `[${date_str}] ${msg}`;
}
