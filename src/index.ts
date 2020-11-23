
/**
 * 
 * TODO:
 * 
 * 1. 增加多id的购买，支持两种模式
 * 2. 增加定时购买能力
 * 3. 判断是否需要加入购物车（不然可能会下两个单）
 * 
 */

import fetch, { Response as NodeFetchResponse } from "node-fetch";
import { getLogger } from "log4js";

import fs from "fs";
import path from "path";

import yaml from "js-yaml";

const config_path = path.join(__dirname, "../config.yaml");

interface Config {
  COOKIE: string;
  PAY_SHIP_REQUEST_BODY: string;
  product_id: string;
  user_key: string;
  fast_polling_interval: number;
  slow_polling_interval: number;
  target_time: string;
  rush_type: RushType;
}

enum RushType {
  Relay = "Relay",
  OneOf = "OneOf"
}

const configs = yaml.safeLoad(fs.readFileSync(config_path).toString()) as Config;

const { COOKIE, PAY_SHIP_REQUEST_BODY, product_id, user_key, slow_polling_interval } = configs;

var logger = getLogger();
logger.level = "debug";

async function main() {
  const uncheck_res = await uncheck_all();

  let is_added = false;

  const add_to_cart = await add_to_cart_request(product_id);

  while (!is_added) {
    logger.debug(`正在将产品${product_id}加入购物车`);
    // 
    const cart_res = await select_in_cart_req(product_id);
    const body = JSON.parse(cart_res.parsed_body);
    is_added = is_target_add_to_order(body);

    if (is_added) {
      logger.debug(`产品${product_id}加入购物车成功! ！！马上准备下单！！！`);
    } else {
      logger.debug(`产品${product_id}加入购物车失败!`);
    }

    if (!is_added) {
      logger.debug(`等待${slow_polling_interval}ms后继续尝试添加产品${product_id}`);
      await sleep(slow_polling_interval);
    }
  }

  const pay_ship_res = await save_pay_and_ship_new();

  logger.debug(`产品${product_id}正在下单`);
  const res = await submit_order();

  const parsed = JSON.parse((res as any).parsed_body);

  logger.debug(parsed.message);

  logger.debug(`产品${product_id}请到手机app订单处完成付款`);
}

function is_target_add_to_order(order_res: any) {
  const resultData = order_res.resultData.cartInfo;

  // If the cart price is not 0 means the target is added in.
  return resultData.Price > 0;
}

async function sleep(time: number) {
  return new Promise<void>((resolve) => {
    setTimeout(function () {
      resolve();
    }, time);
  });
}

main();

interface JDApiConfig {
  body: string;
}

async function refresh_cart() {
  const url = "https://cart.jd.com/";

  const res = await fetch(url, {
    headers: {
      cookie: COOKIE,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "Connection": "keep-alive",
      Host: "cart.jd.com",
      Referer: "https://item.jd.com/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-site",
    },
    method: "GET",
  });

  return new Promise((resolve, reject) => {
    if (!res.ok) {
      reject(res);
    }

    let response_body = "";

    res.body.on("data", function (d) {
      response_body += d.toString();
    });

    res.body.on("end", function () {
      resolve({
        parsed_body: response_body,
        response: res,
      });
    });
  });
}

async function send_js_api_request(api_config: JDApiConfig) {
  const url = "https://api.m.jd.com/api";

  const res = await fetch(url, {
    // body: api_config.body,
    // credentials: "include",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/plain, */*",
      cookie: COOKIE,
      origin: "https://trade.jd.com",
      pragma: "no-cache",
      referer: "https://trade.jd.com/shopping/order/getOrderInfo.action",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
    },
    method: "POST",
  });

  return new Promise((resolve, reject) => {
    if (!res.ok) {
      reject(res);
    }

    let response_body = "";

    res.body.on("data", function (d) {
      response_body += d.toString();
    });

    res.body.on("end", function () {
      resolve({
        parsed_body: response_body,
        response: res,
      });
    });
  });
}

async function add_to_cart_request(product_id: string) {

  const url = `https://cart.jd.com/gate.action?pid=${product_id}&pcount=1&ptype=1`

  const res = await fetch(url, {
    headers: {
      cookie: COOKIE,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      "Connection": "keep-alive",
      Referer: "https://item.jd.com/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-site",
    },
    method: "GET",
  });

  return new Promise((resolve, reject) => {
    if (!res.ok) {
      reject(res);
    }

    let response_body = "";

    res.body.on("data", function (d) {
      response_body += d.toString();
    });

    res.body.on("end", function () {
      resolve({
        parsed_body: response_body,
        response: res,
      });
    });
  });
}

/**
 * 把购物车里的所有选中的商品都清除掉
 *
 * @return {*} 
 */
async function uncheck_all() {
  const url = "https://api.m.jd.com/api";

  const data = {
    serInfo: {
      area: "1_2800_2851_0",
      "user-key": user_key,
    },
  };

  const body = {
    functionId: "pcCart_jc_cartUnCheckAll",
    appid: "JDC_mall_cart",
    loginType: 3,
    body: data,
  };

  const res = await fetch(url, {
    body: querystring(body),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/plain, */*",
      cookie: COOKIE,
      origin: "https://cart.jd.com",
      referer: "https://cart.jd.com/",
      pragma: "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
    },
    method: "POST",
  });

  return new Promise((resolve, reject) => {
    if (!res.ok) {
      reject(res);
    }

    let response_body = "";

    res.body.on("data", function (d) {
      response_body += d.toString();
    });

    res.body.on("end", function () {
      resolve({
        parsed_body: response_body,
        response: res,
      });
    });
  });
}

/**
 * 把商品给加入到购物车，并且选中，之后就可以直接下单了
 *
 * @param {string} id
 * @param {string} [skuUuid]
 * @return {*}  {Promise<{ parsed_body: string; response: NodeFetchResponse }>}
 */
async function select_in_cart_req(
  id: string,
  skuUuid?: string
): Promise<{ parsed_body: string; response: NodeFetchResponse }> {
  const url = "https://api.m.jd.com/api";

  const data = {
    operations: [
      {
        TheSkus: [
          {
            Id: id,
            num: 1,
            skuUuid: skuUuid || "10180236205873752893575950336",
            useUuid: false,
          },
        ],
      },
    ],
    serInfo: {
      area: "5_274_0_0",
      "user-key": user_key,
    },
  };

  const body = {
    functionId: "pcCart_jc_cartCheckSingle",
    appid: "JDC_mall_cart",
    body: data,
  };

  const res = await fetch(url, {
    body: querystring(body),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/plain, */*",
      cookie: COOKIE,
      origin: "https://cart.jd.com",
      pragma: "no-cache",
      referer: "https://cart.jd.com/",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
    },
    method: "POST",
  });

  return new Promise((resolve, reject) => {
    if (!res.ok) {
      reject(res);
    }

    let response_body = "";

    res.body.on("data", function (d) {
      response_body += d.toString();
    });

    res.body.on("end", function () {
      resolve({
        parsed_body: response_body,
        response: res,
      });
    });
  });
}

function querystring(obj: any) {
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
      return value;
    }
  }
}

/**
 * 提交订单，也就是下单了，最后一步
 *
 * @return {*} 
 */
async function submit_order() {
  const url = "https://trade.jd.com/shopping/order/submitOrder.action?";

  const res = await fetch(url, {
    body:
      "overseaPurchaseCookies=&vendorRemarks=[]&submitOrderParam.sopNotPutInvoice=false&submitOrderParam.trackID=TestTrackId&submitOrderParam.ignorePriceChange=0&submitOrderParam.btSupport=0&submitOrderParam.eid=MDG5CG427ZU3OOGNXTUFFKEWLOPVR5Q4STCCZLYYZROQAAESGB7IWMRBGXRYDN6YHHWMY7NPIHS5TQ662YD7U4CNEA&submitOrderParam.fp=1209df5109a95a1bb2b83841e31fb7e0&submitOrderParam.jxj=1",
    // credentials: "include",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/plain, */*",
      cookie: COOKIE,
      origin: "https://cart.jd.com",
      pragma: "no-cache",
      referer: "https://cart.jd.com/",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
    },
    method: "POST",
  });

  return new Promise((resolve, reject) => {
    if (!res.ok) {
      reject(res);
    }

    let response_body = "";

    res.body.on("data", function (d) {
      response_body += d.toString();
    });

    res.body.on("end", function () {
      resolve({
        parsed_body: response_body,
        response: res,
      });
    });
  });
}

/**
 * 更改配送信息
 *
 * @return {*} 
 */
async function save_pay_and_ship_new() {
  const url =
    "https://trade.jd.com/shopping/dynamic/payAndShip/savePayAndShipNew.action";

  const res = await fetch(url, {
    body: PAY_SHIP_REQUEST_BODY,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/plain, */*",
      cookie: COOKIE,
      origin: "https://cart.jd.com",
      pragma: "no-cache",
      referer: "https://cart.jd.com/",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
    },
    method: "POST",
  });

  return new Promise((resolve, reject) => {
    if (!res.ok) {
      reject(res);
    }

    let response_body = "";

    res.body.on("data", function (d) {
      response_body += d.toString();
    });

    res.body.on("end", function () {
      resolve({
        parsed_body: response_body,
        response: res,
      });
    });
  });
}
