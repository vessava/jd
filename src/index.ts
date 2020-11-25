import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { Parser } from "htmlparser2";
import {
  sleep,
  send_jd_request,
  wait_for_start_time,
  JDApiConfig,
  send_jd_api_request,
  send_new_jd_api_request,
  Logger,
} from "./utils";
import { get_all_cart_ids } from "./cart";

const config_path = path.join(__dirname, "../config.yaml");

const logger = new Logger();
interface BuyConfig {
  COOKIE: string;
  PAY_SHIP_REQUEST_BODY: string;
  product_id: string[] | string;
  user_key: string;
  fast_polling_interval?: number;
  slow_polling_interval?: number;
  target_time?: {
    hour: number;
    minutes?: number;
    date?: number;
  };
  rush_type: RushType;
  price_limit?: number;
}

interface BuyContext {
  cookie: string;
  user_key: string;
  fast_polling_interval: number;
  slow_polling_interval: number;
  price_limit?: number;
}

enum RushType {
  Relay = "Relay",
  OneOf = "OneOf",
}

const DEFAULT_SLOW_POLLING_INTERVAL = 100;
const DEFAULT_FAST_POLLING_INTERVAL = 50;
const DEFAULT_ORDER_INTERVAL = 100;

const configs = yaml.safeLoad(
  fs.readFileSync(config_path).toString()
) as BuyConfig;

async function main() {
  execute(configs);
}

async function execute(configs: BuyConfig) {
  const {
    COOKIE,
    product_id: original_prod_ids,
    user_key,
    slow_polling_interval,
    fast_polling_interval,
    target_time,
    price_limit,
  } = configs;

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
  } catch (e) {
    logger.error(e.toString());
    logger.info("检测到错误，请尝试更新cookie");
    return;
  }

  const infos = await get_select_product_relative_info(ctx, product_ids);

  await uncheck_all(ctx);

  if (target_time) {
    await wait_for_start_time({ ...target_time, logger });
  }

  const length = product_ids.length;

  let i = 0;
  while (i < length) {
    const id = product_ids[i];
    try {
      await try_to_order(ctx, id, infos[i]);
    } catch (e) {
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
        logger.error(`添加${id}购物车出现问题，有可能是程序漏洞！！！`);
      }
      return is_contain_ensure;
    });
  } else {
    return product_ids;
  }
}

/**
 * 
 * var me = this;
$('.cart-warp').delegate('input[name=checkItem]', 'click', function(){

  // 点击复选框后所有复选框不可选
  $(this).attr("disabled", true);

  var mEl = $(this);
  var productDom = $(this).closest(".item-item");
  
  var manFanZeng = mEl.attr("manFanZeng");
  var arr = mEl.val().split("_");
  var pid = arr[0];
  var ptype = arr[1];
  var targetId = 0;
  var skuUuid = productDom.attr("skuuuid");
  var handtailor = productDom.attr("handtailor");

  if(arr.length == 3){
      targetId = arr[2];
  }

  if(me.checkSku(pid)){

      // 是否勾选商品
      var cb = mEl.prop("checked");
      var act = cb ? 'selectItem' : 'cancelItem';
      var tip = cb ? '勾选商品失败，请刷新页面重试。' : '取消商品失败，请刷新页面重试。';

      var outSkus = me.outSkus;
      var venderId = mEl.parents('.cart-tbody').attr('id');
      venderId = venderId.substring(venderId.lastIndexOf('_')+1);
    var params = "&pid=" + escape(pid)
              + "&ptype=" + escape(ptype)
              + "&skuUuid=" + escape(skuUuid)
            + ((handtailor == "true") ? "&useUuid=true" : "")
              + "&packId=0"
              + "&targetId=" + escape(targetId)
              + "&promoID=" + escape(targetId)
              + "&venderId=" + venderId
              + "&t=" + me.t
            + "&manFanZeng=1";
    
      if(manFanZeng == '1' || ptype == '4'){
        var venderId = mEl.parents('.cart-tbody').attr('id');
          venderId = venderId.substring(venderId.lastIndexOf('_')+1);
        var params = "&pid=" + escape(pid)
                + "&ptype=" + escape(ptype)
                + "&skuUuid=" + escape(skuUuid)
                + ((handtailor == "true") ? "&useUuid=true" : "")
                + "&packId=0"
                + "&targetId=" + escape(targetId)
                + "&promoID=" + escape(targetId)
                + "&venderId=" + venderId
                + "&t=" + me.t
              + "&manFanZeng=1";
        
          me.updateVenderInfo(me.iurl + "/" + act + ".action", params, tip);
      }else{
        var venderId = mEl.parents('.cart-tbody').attr('id');
          venderId = venderId.substring(venderId.lastIndexOf('_')+1);
        var params = "&outSkus=" + outSkus
                + "&pid=" + escape(pid)
                + "&ptype=" + escape(ptype)
                + "&skuUuid=" + escape(skuUuid)
                + ((handtailor == "true") ? "&useUuid=true" : "")
                + "&packId=0"
                + "&targetId=" + escape(targetId)
                + "&promoID=" + escape(targetId)
                + "&venderId=" + venderId
                + "&t=" + me.t;
    me.updateProductInfo(me.iurl + "/" + act + ".action?rd" + Math.random(),
        params,
        tip,
        function(result){
            me.toggleVenderCheckbox(cb, mEl);
        }
    );
      }
 */

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
    throw new Error(`从html获取产品${product_id}的信息失败！！！请调试代码`);
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
    logger.info(`正在将产品${product_id}加入购物车`);

    const cart_res = await select_in_cart_req(
      product_id,
      ctx,
      product_relative_info
    );
    const body = JSON.parse(cart_res.parsed_body);

    let too_frequent = false;

    const { can_go_order, fail_reason: reason } = is_target_add_to_order(
      body,
      ctx.price_limit
    );

    can_go_to_next_step = can_go_order;

    if (can_go_to_next_step) {
      logger.info(`产品${product_id}加入购物车成功! ！！马上准备下单！！！`);
    } else {
      if (reason === AddCartFailReason.PriceLimit) {
        logger.error(
          `产品${product_id}的价格还不满足价格限制${ctx.price_limit}元，继续等待直到抢购价!`
        );
      } else {
        logger.error(`产品${product_id}加入购物车失败!`);
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
  const resultData = order_res.sortedWebCartResult;
  const real_price_lim = price_limit || Number.POSITIVE_INFINITY;

  // If the cart price is not 0 means the target is added in.
  return {
    can_go_order: resultData.modifyResult.modifyProductId ? true : false,
    fail_reason: AddCartFailReason.Default,
  };
}

main();

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
  return send_new_jd_api_request({
    action_path: "cancelAllItem.action",
    form_data: {
      t: 0,
      random: Math.random(),
      locationId: "1-2800-2851-0",
    },
    cookie: ctx.cookie
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
