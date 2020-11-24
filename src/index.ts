import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import {
  sleep,
  send_jd_request,
  wait_for_start_time,
  JDApiConfig,
  send_jd_api_request,
  Logger
} from "./utils";
import { is_cart_already_contain } from "./cart";

const config_path = path.join(__dirname, "../config.yaml");

const logger = new Logger();
interface BuyConfig {
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

interface BuyContext {
  cookie: string;
  user_key: string;
}

enum RushType {
  Relay = "Relay",
  OneOf = "OneOf",
}

const DEFAUL_SLOW_POLLING_INTERVAL = 100;

const DEFAUL_FAST_POLLING_INTERVAL = 50;

const configs = yaml.safeLoad(
  fs.readFileSync(config_path).toString()
) as BuyConfig;

async function main() {
  execute(configs);
}

async function execute(configs: BuyConfig) {
  const {
    COOKIE,
    PAY_SHIP_REQUEST_BODY,
    product_id,
    user_key,
    slow_polling_interval,
    fast_polling_interval,
    target_time,
  } = configs;
  const safe_slow_polling_interval =
    slow_polling_interval || DEFAUL_SLOW_POLLING_INTERVAL;
  const safe_fast_polling_interval =
    fast_polling_interval || DEFAUL_FAST_POLLING_INTERVAL;
  const ctx: BuyContext = { cookie: COOKIE, user_key };

  const uncheck_res = await uncheck_all(ctx);

  // 如果手动保证添加购物车的话，这一步可以省略
  await try_to_add_to_cart(
    {
      user_key: user_key,
      functionId: "pcCart_jc_getCurrentCart",
      cookie: COOKIE,
    },
    product_id,
    ctx
  );

  if (target_time) {
    await wait_for_start_time({ ...target_time, logger });
  }

  await try_to_select_target_product(
    safe_fast_polling_interval,
    safe_slow_polling_interval,
    product_id,
    ctx
  );

  logger.info(`产品${product_id}正在修改配送信息`);
  // 请求一遍订单页面，下面注释的是修改配送方式页面，接口感觉比较慢。
  // 需要做一次这个请求，不然最后下单时候会提示配送方式不对。
  // const pay_ship_res = await save_pay_and_ship_new(PAY_SHIP_REQUEST_BODY, ctx);
  await get_order(ctx);
  logger.info(`产品${product_id}修改配送信息完成`);

  logger.info(`产品${product_id}正在下单`);
  const res = await submit_order(ctx);

  let parsed: any;
  try {
    parsed = JSON.parse((res as any).parsed_body);
  } catch (e) {
    // 进入到这里应该是服务器不接受了
    const decoder = new TextDecoder("gbk");
    const gbk_decoded = decoder.decode((res as any).body_buffer);

    logger.error("服务器出错，也许是相关参数过期了！！请尝试更新一下cookie!!!");

    return;
  }

  // message为空的话意味着应该是成功了
  if (!parsed.message) {
    logger.success("恭喜🎉！！！成功了!!!");
    logger.success(`产品${product_id}请到手机app订单处完成付款...`);
  } else {
    logger.error(parsed.message);
    logger.info("请查看上一条内容，也许下单失败了～");
  }
}

async function try_to_add_to_cart(
  config: JDApiConfig,
  product_id: string,
  ctx: BuyContext
) {
  const is_contain = await is_cart_already_contain(config, product_id);

  if (!is_contain) {
    const add_to_cart = await add_to_cart_request(product_id, ctx);
  }

  // Check for the second time to ensure the product is truely added.
  const is_contain_ensure = await is_cart_already_contain(config, product_id);

  if (!is_contain_ensure) {
    throw new Error("添加购物车出现问题，有可能是程序漏洞！！！");
  }
}

async function try_to_select_target_product(
  fast_polling_interval: number,
  slow_polling_interval: number,
  product_id: string,
  ctx: BuyContext
) {
  let is_target_selected = false;
  while (!is_target_selected) {
    logger.info(`正在将产品${product_id}加入购物车`);

    const cart_res = await select_in_cart_req(product_id, ctx);
    const body = JSON.parse(cart_res.parsed_body);

    let too_frequent = false;
    if (body.success === false) {
      // 如果请求过快，这里可能出现 "request send too frequent"
      // logger.info(body.message);
      logger.error("请求过于频繁！！！");
      // throw new Error(body.message);
      too_frequent = true;
    }

    is_target_selected = is_target_add_to_order(body);

    if (is_target_selected) {
      logger.info(`产品${product_id}加入购物车成功! ！！马上准备下单！！！`);
    } else {
      logger.error(`产品${product_id}加入购物车失败!`);
    }

    if (!is_target_selected) {
      const wait_time = too_frequent
        ? slow_polling_interval
        : fast_polling_interval;
      logger.info(`等待${wait_time}ms后继续尝试添加产品${product_id}`);
      await sleep(wait_time);
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

async function refresh_cart(cookie: string) {
  const url = "https://cart.jd.com/";

  const options = {
    headers: {
      cookie,
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

async function get_order(ctx: BuyContext) {
  const url = "https://trade.jd.com/shopping/order/getOrderInfo.action";

  const options = {
    headers: {
      cookie: ctx.cookie,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      Connection: "keep-alive",
      pragma: "no-cache",
      Referer: "https://cart.jd.com/",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-site",
    },
    method: "GET",
  };

  try {
    const res = await send_jd_request(url, options);
    return res;
  } catch (e) {
    logger.error(e);
  }
}

async function add_to_cart_request(product_id: string, ctx: BuyContext) {
  const url = `https://cart.jd.com/gate.action?pid=${product_id}&pcount=1&ptype=1`;

  const options = {
    headers: {
      cookie: ctx.cookie,
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

  return send_jd_request(url, options);
}

/**
 * 把购物车里的所有选中的商品都清除掉
 *
 * @return {*}
 */
async function uncheck_all(ctx: BuyContext) {
  return send_jd_api_request({
    ...ctx,
    functionId: "pcCart_jc_cartUnCheckAll",
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
  product_id: string,
  ctx: BuyContext,
  skuUuid?: string
) {
  const extend = {
    operations: [
      {
        TheSkus: [
          {
            Id: product_id,
            num: 1,
            skuUuid: skuUuid || "10180236205873752893575950336",
            useUuid: false,
          },
        ],
      },
    ],
  };

  return send_jd_api_request({
    ...ctx,
    area: "5_274_0_0",
    functionId: "pcCart_jc_cartCheckSingle",
    extend_data: extend,
  });
}

/**
 * 提交订单，也就是下单了，最后一步
 *
 * @return {*}
 */
async function submit_order(ctx: BuyContext) {
  const url = "https://trade.jd.com/shopping/order/submitOrder.action?";

  const options = {
    body:
      "overseaPurchaseCookies=&vendorRemarks=[]&submitOrderParam.sopNotPutInvoice=false&submitOrderParam.trackID=TestTrackId&submitOrderParam.ignorePriceChange=0&submitOrderParam.btSupport=0&submitOrderParam.eid=MDG5CG427ZU3OOGNXTUFFKEWLOPVR5Q4STCCZLYYZROQAAESGB7IWMRBGXRYDN6YHHWMY7NPIHS5TQ662YD7U4CNEA&submitOrderParam.fp=1209df5109a95a1bb2b83841e31fb7e0&submitOrderParam.jxj=1",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/plain, */*",
      cookie: ctx.cookie,
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
async function save_pay_and_ship_new(
  pay_ship_request_body: string,
  ctx: BuyContext
) {
  const url =
    "https://trade.jd.com/shopping/dynamic/payAndShip/savePayAndShipNew.action";

  const options = {
    body: pay_ship_request_body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json, text/plain, */*",
      cookie: ctx.cookie,
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
