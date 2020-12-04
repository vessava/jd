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