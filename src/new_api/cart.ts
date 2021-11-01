import {
  send_jd_api_request,
  JDApiConfig,
} from "../utils";

export async function get_current_cart(config: JDApiConfig) {
  const res = await send_jd_api_request(config);
  const cart_info = JSON.parse(res.parsed_body);
  return cart_info;
}

export async function get_all_cart_ids(config: JDApiConfig): Promise<[string[], Vendor[]]> {
  const cart_info = await get_current_cart(config);
  const vendors = cart_info.resultData.cartInfo.vendors;
  const all_ids = extract_all_product_ids(vendors);

  const all_ids_string = all_ids.map((id) => id.toString());
  return [all_ids_string, vendors];

  function extract_all_product_ids(vendors: any[]) {
    const arr: string[] = [];

    vendors.forEach((vendor) => {
      vendor.sorted.forEach((item: any) => {
        // This may be a group item.
        if (item.item.items && item.item.items.length > 0) {
          item.item.items.forEach((item: any) => {
            push_item_id(item);
          });
        }

        push_item_id(item);
      });
    });

    return arr;

    function push_item_id(item: any) {
      arr.push(item.item.Id);
    }
  }
}
