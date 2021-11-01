interface ComeFromConfig {
  /**
   * The cookie for every request
   *
   * @type {string}
   * @memberof BuyConfig
   */
  COOKIE: string;
  /**
   * The http post body when send pay and ship request
   *
   * @type {string}
   * @memberof BuyConfig
   */
  PAY_SHIP_REQUEST_BODY: string;
  /**
   * The product id for the target
   *
   * @type {(string[] | string)}
   * @memberof BuyConfig
   */
  product_id: string[] | string;

  /**
   * Fast polling interval when the server is not banned by too frequent request
   *
   * @type {number}
   * @memberof BuyOptions
   */
  fast_polling_interval?: number;
  slow_polling_interval?: number;
  target_time?: {
    hour: number;
    minutes?: number;
    date?: number;
  };
  /**
   * @Unimplemented
   *
   * @type {RushType}
   * @memberof BuyOptions
   */
  rush_type: RushType;
  price_limit?: number;
}

/**
 *
 *
 * @interface BuyOptions
 * @extends {ComeFromConfig}
 */
interface BuyOptions extends ComeFromConfig {
  /**
   * Come from COOKIE
   *
   * @type {string}
   * @memberof BuyConfig
   */
  user_key: string;
}

/**
 *
 *
 * @interface BuyContext
 */
interface BuyContext {
  /**
   * Refer to the cookie of "ButConfig"
   *
   * @type {string}
   * @memberof BuyContext
   */
  cookie: string;
  /**
   * User key, will be put into all js api request body
   *
   * @type {string}
   * @memberof BuyContext
   */
  user_key: string;
  fast_polling_interval: number;
  slow_polling_interval: number;
  /**
   *
   *
   * @type {number}
   * @memberof BuyContext
   */
  price_limit?: number;
}

/**
 *
 *
 * @enum {number}
 */
const enum RushType {
  Relay = "Relay",
  OneOf = "OneOf",
}

/**
 * Represent a item in jd cart
 *
 * @interface Item
 */
interface Item {
  Id: string;
  skuUuid?: string;
}

/**
 * Represent a vendor in jd cart
 *
 * @interface Vendor
 */
interface Vendor {
  vendorId: string;
  sorted: [
    {
      itemType: number;
      item: Item;
    }
  ];
}
