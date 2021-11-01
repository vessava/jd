/// <reference path="../../types/interface.d.ts" />

import {
  sleep,
  send_jd_request,
  wait_for_start_time,
  JDApiConfig,
  send_jd_api_request,
  Logger,
  parse_user_key_from_cookie,
} from "../utils";
import { get_all_cart_ids } from "./cart";
import { find_target_item_in_vendors } from "./utils";

const logger = new Logger();

const DEFAULT_SLOW_POLLING_INTERVAL = 100;
const DEFAULT_FAST_POLLING_INTERVAL = 50;
const DEFAULT_ORDER_INTERVAL = 100;

export async function execute(configs: ComeFromConfig) {
  const {
    COOKIE,
    product_id: original_prod_ids,
    slow_polling_interval,
    fast_polling_interval,
    target_time,
  } = configs;

  const user_key = parse_user_key_from_cookie(COOKIE) || "";

  const safe_slow_polling_interval =
    slow_polling_interval || DEFAULT_SLOW_POLLING_INTERVAL;

  const safe_fast_polling_interval =
    fast_polling_interval || DEFAULT_FAST_POLLING_INTERVAL;

  const ctx: BuyContext = {
    cookie: COOKIE,
    user_key,
    fast_polling_interval: safe_fast_polling_interval,
    slow_polling_interval: safe_slow_polling_interval,
  };

  const product_ids = Array.isArray(original_prod_ids)
    ? original_prod_ids
    : [original_prod_ids];

  // 如果手动保证添加购物车的话，这一步可以省略

  let vendors: Vendor[];
  try {
    vendors = await try_to_add_to_cart(
      {
        user_key: user_key,
        functionId: "pcCart_jc_getCurrentCart",
        cookie: COOKIE,
      },
      product_ids,
      ctx
    );
  } catch (e: any) {
    logger.error(e.toString());
    // logger.info("继续尝试抢购成功的商品");
    throw new Error("添加商品请求错误，将停止进程🤚");
  }

  await uncheck_all(ctx);

  if (target_time) {
    await wait_for_start_time({ ...target_time, logger });
  }

  const length = product_ids.length;

  let i = 0;
  while (i < length) {
    const id = product_ids[i];
    try {
      await try_to_order(ctx, id, vendors);
    } catch (e: any) {
      logger.error("Catching error in function 'try_to_order'.");
      logger.error(e);
      throw new Error(e);
    }
    i++;
  }
}

async function try_to_order(
  ctx: BuyContext,
  product_id: string,
  vendors: Vendor[]
) {
  await try_to_select_target_product(
    ctx.fast_polling_interval,
    ctx.slow_polling_interval,
    product_id,
    vendors,
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
    // 这里会返回一个GBK编码的html页面
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
  product_ids: string[],
  ctx: BuyContext
) {
  const [all_ids] = await get_all_cart_ids(config);

  let i = 0;

  while (i < product_ids.length) {
    const product_id = product_ids[i];
    // const is_contain =  is_cart_already_contain(config, product_id);
    const is_contain = all_ids.includes(product_id);

    if (!is_contain) {
      // Check for the second time to ensure the product is truely added.
      await add_to_cart_request(product_id, ctx);
    }
    i++;
  }

  const [all_ids_after, vendors] = await get_all_cart_ids(config);

  product_ids.forEach((id) => {
    const is_contain_ensure = all_ids_after.includes(id);
    if (!is_contain_ensure) {
      throw new Error(`添加${id}购物车出现问题，有可能是程序漏洞！！！`);
    }
  });

  return vendors;
}

async function try_to_select_target_product(
  fast_polling_interval: number,
  slow_polling_interval: number,
  product_id: string,
  vendors: Vendor[],
  ctx: BuyContext
) {
  let is_target_selected = false;
  while (!is_target_selected) {
    logger.info(`正在将产品${product_id}加入购物车`);

    const item = find_target_item_in_vendors(vendors, product_id);
    const sku_uuid = item ? item.skuUuid : null;
    if (!sku_uuid) {
      throw new Error(
        `Logic Error: 在购物车中没有找到物品"${product_id}"的item`
      );
    }

    const cart_res = await select_in_cart_req(product_id, ctx, sku_uuid);
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
  } catch (e: any) {
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
  skuUuid: string
) {
  const extend = {
    operations: [
      {
        TheSkus: [
          {
            Id: product_id,
            num: 1,
            skuUuid: skuUuid,
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
    body: "overseaPurchaseCookies=&vendorRemarks=[]&submitOrderParam.sopNotPutInvoice=false&submitOrderParam.trackID=TestTrackId&submitOrderParam.ignorePriceChange=0&submitOrderParam.btSupport=0&submitOrderParam.eid=MDG5CG427ZU3OOGNXTUFFKEWLOPVR5Q4STCCZLYYZROQAAESGB7IWMRBGXRYDN6YHHWMY7NPIHS5TQ662YD7U4CNEA&submitOrderParam.fp=1209df5109a95a1bb2b83841e31fb7e0&submitOrderParam.jxj=1",
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
