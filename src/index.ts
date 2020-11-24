/**
 *
 * TODO:
 *
 * 1. 增加多id的购买，支持两种模式
 * 2. 增加定时购买能力
 * 3. 判断是否需要加入购物车（不然可能会下两个单）
 *
 */

import { getLogger } from "log4js";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { sleep, send_jd_request, wait_for_start_time } from "./utils";

const config_path = path.join(__dirname, "../config.yaml");

interface Config {
  COOKIE: string;
  PAY_SHIP_REQUEST_BODY: string;
  product_id: string;
  user_key: string;
  fast_polling_interval?: number;
  slow_polling_interval?: number;
  target_time?: {
    hour: number;
    minutes?: number;
    date?: number;
  };
  rush_type: RushType;
}

enum RushType {
  Relay = "Relay",
  OneOf = "OneOf",
}

const DEFAUL_SLOW_POLLING_INTERVAL = 100;

const DEFAUL_FAST_POLLING_INTERVAL = 10;

const configs = yaml.safeLoad(
  fs.readFileSync(config_path).toString()
) as Config;

const {
  COOKIE,
  PAY_SHIP_REQUEST_BODY,
  product_id,
  user_key,
  slow_polling_interval,
  fast_polling_interval,
  target_time,
} = configs;

var logger = getLogger();
logger.level = "debug";

async function main() {
  const safe_slow_polling_interval =
    slow_polling_interval || DEFAUL_SLOW_POLLING_INTERVAL;
  const safe_fast_polling_interval =
    fast_polling_interval || DEFAUL_FAST_POLLING_INTERVAL;
  const uncheck_res = await uncheck_all();

  const add_to_cart = await add_to_cart_request(product_id);

  if (target_time) {
    await wait_for_start_time({ ...target_time, logger });
  }

  await try_to_select_target_product(safe_fast_polling_interval);

  const pay_ship_res = await save_pay_and_ship_new();

  logger.debug(`产品${product_id}正在下单`);
  const res = await submit_order();

  let parsed: any;
  try {
    parsed = JSON.parse((res as any).parsed_body);
    logger.debug(parsed.message);
  } catch (e) {
    // 进入到这里应该是服务器不接受了
    const decoder = new TextDecoder("gbk");
    const gbk_decoded = decoder.decode((res as any).body_buffer);

    logger.debug("服务器出错，也许是相关参数过期了！！请尝试更新一下cookie!!!");
  }

  logger.debug(`产品${product_id}请到手机app订单处完成付款`);
}

async function try_to_select_target_product(fast_polling_interval: number) {
  let is_target_selected = false;
  while (!is_target_selected) {
    logger.debug(`正在将产品${product_id}加入购物车`);

    const cart_res = await select_in_cart_req(product_id);
    const body = JSON.parse(cart_res.parsed_body);

    // TODO: 如果请求过快，这里可能出现 "request.send too frequent"
    is_target_selected = is_target_add_to_order(body);

    if (is_target_selected) {
      logger.debug(`产品${product_id}加入购物车成功! ！！马上准备下单！！！`);
    } else {
      logger.debug(`产品${product_id}加入购物车失败!`);
    }

    if (!is_target_selected) {
      logger.debug(
        `等待${fast_polling_interval}ms后继续尝试添加产品${product_id}`
      );
      await sleep(fast_polling_interval);
    }
  }
}

function is_target_add_to_order(order_res: any) {
  const resultData =
    order_res && order_res.resultData && order_res.resultData.cartInfo;

  // If the cart price is not 0 means the target is added in.
  return resultData && resultData.Price > 0;
}

main();

async function refresh_cart() {
  const url = "https://cart.jd.com/";

  const options = {
    headers: {
      cookie: COOKIE,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      Connection: "keep-alive",
      Host: "cart.jd.com",
      Referer: "https://item.jd.com/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-site",
    },
    method: "GET",
  };

  return send_jd_request(url, options);
}

async function add_to_cart_request(product_id: string) {
  const url = `https://cart.jd.com/gate.action?pid=${product_id}&pcount=1&ptype=1`;

  const options = {
    headers: {
      cookie: COOKIE,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      Connection: "keep-alive",
      Referer: "https://item.jd.com/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-site",
    },
    method: "GET",
  };

  send_jd_request(url, options);
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

  const options = {
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
  };

  return send_jd_request(url, options);
}

/**
 * 把商品给加入到购物车，并且选中，之后就可以直接下单了
 *
 * @param {string} id
 * @param {string} [skuUuid]
 * @return {*}  {Promise<{ parsed_body: string; response: NodeFetchResponse }>}
 */
async function select_in_cart_req(id: string, skuUuid?: string) {
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

  const options = {
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
  };

  return send_jd_request(url, options);
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

  const options = {
    body:
      "overseaPurchaseCookies=&vendorRemarks=[]&submitOrderParam.sopNotPutInvoice=false&submitOrderParam.trackID=TestTrackId&submitOrderParam.ignorePriceChange=0&submitOrderParam.btSupport=0&submitOrderParam.eid=MDG5CG427ZU3OOGNXTUFFKEWLOPVR5Q4STCCZLYYZROQAAESGB7IWMRBGXRYDN6YHHWMY7NPIHS5TQ662YD7U4CNEA&submitOrderParam.fp=1209df5109a95a1bb2b83841e31fb7e0&submitOrderParam.jxj=1",
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
  };

  return send_jd_request(url, options);
}

/**
 * 更改配送信息
 *
 * @return {*}
 */
async function save_pay_and_ship_new() {
  const url =
    "https://trade.jd.com/shopping/dynamic/payAndShip/savePayAndShipNew.action";

  const options = {
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
  };

  return send_jd_request(url, options);
}
