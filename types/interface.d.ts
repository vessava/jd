interface BuyConfig {
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
   * Maybe not needed, usually doesn't need changing everytime.
   *
   * @type {string}
   * @memberof BuyConfig
   */
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
  /**
   * Refer to the cookie of "ButConfig"
   *
   * @type {string}
   * @memberof BuyContext
   */
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