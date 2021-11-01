import { Parser } from "htmlparser2";
import {
  sleep,
  send_jd_request,
  wait_for_start_time,
  JDApiConfig,
  send_new_jd_api_request,
  Logger,
  parse_user_key_from_cookie,
} from "../utils";
import { get_all_cart_ids } from "./cart";

const logger = new Logger();

const DEFAULT_SLOW_POLLING_INTERVAL = 1000;
const DEFAULT_FAST_POLLING_INTERVAL = 400;
const DEFAULT_ORDER_INTERVAL = 100;

export async function execute(configs: ComeFromConfig) {
  const {
    COOKIE,
    product_id: original_prod_ids,
    slow_polling_interval,
    fast_polling_interval,
    target_time,
    price_limit,
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
    price_limit,
  };

  const product_ids = Array.isArray(original_prod_ids)
    ? original_prod_ids
    : [original_prod_ids];

  // 如果手动保证添加购物车的话，这一步可以省略
  let added_product_ids: string[];
  try {
    added_product_ids = await try_to_add_to_cart(
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
    logger.error("检测到错误，请尝试更新cookie");
    return;
  }

  const infos = await get_select_product_relative_info(ctx, added_product_ids);

  await uncheck_all(ctx);

  if (target_time) {
    await wait_for_start_time({ ...target_time, logger });
  }

  const length = added_product_ids.length;

  let i = 0;
  while (i < length) {
    const id = added_product_ids[i];
    try {
      await try_to_order(ctx, id, infos[i]);
    } catch (e: any) {
      logger.error("Catching error in function 'try_to_order'.");
      logger.error(e);
    }
    i++;
  }
}

async function try_to_order(
  ctx: BuyContext,
  product_id: string,
  product_relative_info: SelectProductInfo
) {
  await try_to_select_target_product(
    ctx.fast_polling_interval,
    ctx.slow_polling_interval,
    product_id,
    ctx,
    product_relative_info
  );

  logger.start(`产品${product_id}正在修改配送信息`);
  // 请求一遍订单页面，下面注释的是修改配送方式页面，接口感觉比较慢。
  // 需要做一次这个请求，不然最后下单时候会提示配送方式不对。
  // const pay_ship_res = await save_pay_and_ship_new(PAY_SHIP_REQUEST_BODY, ctx);
  await get_order(ctx);
  logger.complete(`产品"${product_id}"修改配送信息完成`);

  logger.start(`产品"${product_id}"正在下单`);
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
    logger.complete(`产品"${product_id}"已经下单，请到手机app订单处完成付款...`);
  } else {
    logger.error(parsed.message);
    logger.warn("请查看上一条内容，也许下单失败了～");
  }
}

async function try_to_add_to_cart(
  config: JDApiConfig,
  product_ids: string[],
  ctx: BuyContext
) {
  const all_ids = await get_all_cart_ids(config);

  let i = 0;
  let all_contain = true;

  while (i < product_ids.length) {
    const product_id = product_ids[i];
    // const is_contain =  is_cart_already_contain(config, product_id);
    const is_contain = all_ids.includes(product_id);

    if (!is_contain) {
      all_contain = false;
      // Check for the second time to ensure the product is truely added.
      await add_to_cart_request(product_id, ctx);
    }
    i++;
  }

  if (!all_contain) {
    const all_ids_after = await get_all_cart_ids(config);

    return product_ids.filter((id) => {
      const is_contain_ensure = all_ids_after.includes(id);
      if (!is_contain_ensure) {
        logger.error(
          `添加"${id}"到购物车出现问题，请重新更新cookie。如果依然存在问题，有可能是程序漏洞，请联系开发者！！！`
        );
      }
      return is_contain_ensure;
    });
  } else {
    return product_ids;
  }
}

async function get_select_product_relative_info(
  ctx: BuyContext,
  product_ids: string[]
) {
  const res = await fetch_cart_page_html(ctx);

  const infos = product_ids.map((id) => {
    return parse_product_relative_info_from_html_str(res.parsed_body, id);
  });

  return infos;
}

function parse_product_relative_info_from_html_str(
  html: string,
  product_id: string
): SelectProductInfo {
  let resp: SelectProductInfo;
  let in_target_delete_tag = false;
  let find_target_container = false;
  let find_target_delete_btn = false;

  const parser = new Parser({
    onopentag(name, attribs) {
      if (is_product_dom(name, attribs) && attribs.skuid === product_id) {
        find_target_container = true;
        in_target_delete_tag = true;
        resp = {
          pid: parseInt(attribs.skuid),
          ptype: 1,
          skuUuid: parseInt(attribs.skuuuid),
          packId: 0,
          targetId: 0,
          promoID: 0,
          venderId: 0,
          t: 0,
        };
      }

      if (
        in_target_delete_tag &&
        name === "a" &&
        attribs.id &&
        attribs.id.startsWith("remove")
      ) {
        find_target_delete_btn = true;
        in_target_delete_tag = false;
        const pids = attribs.id;

        const ss = pids.split("_");
        const venderid = parseInt(ss[1]);
        const id = parseInt(ss[2]);
        const type = parseInt(ss[3]);
        let targetId = 0;
        let packId = 0;
        if (ss.length == 5) {
          targetId = parseInt(ss[4]);
        } else if (ss.length == 6) {
          targetId = parseInt(ss[4]);
          packId = parseInt(ss[5]);
        }

        resp.targetId = targetId;
        resp.promoID = targetId;
        resp.ptype = type;
        resp.venderId = venderid;
        resp.pid = id;
      }
    },
  });

  parser.write(html);

  if (!find_target_container || !find_target_delete_btn) {
    throw new Error(`从html获取产品"${product_id}"的信息失败！！！请调试代码`);
  }

  return resp!;

  function is_product_dom(
    name: string,
    attribs: {
      [s: string]: string;
    }
  ) {
    return (
      name === "div" &&
      attribs.id &&
      attribs.id.startsWith("product") &&
      attribs.num
    );
  }
}

async function fetch_cart_page_html(ctx: BuyContext) {
  const url = "https://cart.jd.com/cart.action";

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

  const res = await send_jd_request(url, options);
  return res;
}

async function try_to_select_target_product(
  fast_polling_interval: number,
  slow_polling_interval: number,
  product_id: string,
  ctx: BuyContext,
  product_relative_info: SelectProductInfo
) {
  let can_go_to_next_step = false;
  while (!can_go_to_next_step) {
    logger.start(`正在将产品"${product_id}"加入购物车`);

    const cart_res = await select_in_cart_req(
      product_id,
      ctx,
      product_relative_info
    );

    let too_frequent = false;
    let body;
    try {
      body = JSON.parse(cart_res.parsed_body);
    } catch (e) {
      logger.error("请求太频繁了，接口返回了html");
      too_frequent = true;
    }

    const { can_go_order, fail_reason: reason } = is_target_add_to_order(
      body,
      ctx.price_limit
    );

    can_go_to_next_step = can_go_order;

    if (can_go_to_next_step) {
      logger.log(`产品"${product_id}"加入购物车成功! ！！马上准备下单！！！`);
    } else {
      if (reason === AddCartFailReason.PriceLimit) {
        logger.error(
          `产品"${product_id}"的价格还不满足价格限制${ctx.price_limit}元，继续等待直到抢购价!`
        );
      } else {
        logger.warn(`产品"${product_id}"加入购物车失败!`);
      }
    }

    if (!can_go_to_next_step) {
      const wait_time = too_frequent
        ? slow_polling_interval
        : fast_polling_interval;
      logger.info(`等待${wait_time}ms后继续尝试添加产品${product_id}`);
      await sleep(wait_time);
    }
  }
}

enum AddCartFailReason {
  Default,
  PriceLimit,
}

function is_target_add_to_order(order_res: any, price_limit?: number) {
  if (!order_res) {
    return {
      can_go_order: false,
      fail_reason: AddCartFailReason.Default,
    };
  }

  const resultData = order_res.sortedWebCartResult;
  const real_price_lim = price_limit || Number.POSITIVE_INFINITY;

  const modify_result = resultData.modifyResult;

  const can_go_order = modify_result.selectedCount > 0;

  // If the cart price is not 0 means the target is added in.
  return {
    can_go_order,
    fail_reason: AddCartFailReason.Default,
  };
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
  return send_new_jd_api_request({
    action_path: "cancelAllItem.action",
    form_data: {
      t: 0,
      random: Math.random(),
      locationId: "1-2800-2851-0",
    },
    cookie: ctx.cookie,
  });
}

interface SelectProductInfo {
  pid: number;
  ptype: number;
  skuUuid: number;
  packId: number;
  targetId: number;
  promoID: number;
  venderId: number;
  t: number;
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
  info: SelectProductInfo
) {
  // TODO: 这里的数据，是从html dom上拿到的，这块需要做html解析了，快速的方法是直接填
  const data = info;

  return send_new_jd_api_request({
    action_path: "selectItem.action",
    form_data: data,
    cookie: ctx.cookie,
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
