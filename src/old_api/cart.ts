import {
  JDApiConfig,
  send_new_jd_api_request,
} from "../utils";

export async function get_current_cart(config: JDApiConfig) {
  const res = await send_new_jd_api_request({
    action_path: "cart/miniCartServiceNew.action",
    form_data: { method: "GetCart" },
    cookie: config.cookie,
  });

  const json_str = res.parsed_body.slice(1, -2);

  const decoded = decode(json_str);
  const json = JSON.parse(decoded);

  return json;

  function decode(s: string) {
    return unescape(s.replace(/\\(u.{4})/gm, "%$1").replace(/\\ /gm, ""));
  }
}

export async function get_all_cart_ids(config: JDApiConfig): Promise<string[]> {
  const res = await get_current_cart(config);

  const cart = res.Cart;

  const ids: string[] = [];

  cart.ManJian.forEach(accum_group_item);

  cart.ManZeng.forEach(accum_group_item);

  cart.TheGifts.forEach(accum_group_item);

  // cart.TheSuit.forEach(accum_group_item);

  cart.TheSkus.forEach((sku: any) => {
    ids.push(sku.Id.toString());
  });

  const uniq_ids = ids.map(id => id.toString()).filter(onlyUnique);

  // 这两个就是不可能相等的，比如Num中，套装算一个，一起算价格，但是套装里面是有多个商品的
  // if(uniq_ids.length !== cart.Num) {
  //   throw new Error("在收集product id过程中有错，数量不能对上，程序有问题！！！")
  // }

  return uniq_ids;

  function accum_group_item(item: any) {
    item.Skus.forEach((item: any) => {
      ids.push(item.Id);
    });
  }

  function onlyUnique(value: any, index: number, self: any) {
    return self.indexOf(value) === index;
  }
}
