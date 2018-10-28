import { AxiosRequestConfig } from "axios";

const baseAxiosConfig: AxiosRequestConfig = {
  validateStatus: status => status < 600,
  method: "GET",
  headers: {
    accept: "*/*",
    dnt: 1,
    cookie: "JSESSIONID=",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9",
    origin: "https://www.zillow.com",
    referer: "https://www.zillow.com/homes/for_sale/",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.67 Safari/537.36"
  }
};

export function buildRequestConfig(
  overrideConfig?: AxiosRequestConfig
): AxiosRequestConfig {
  const config = Object.assign({}, baseAxiosConfig, overrideConfig);
  config.headers = Object.assign(
    {},
    baseAxiosConfig.headers,
    overrideConfig ? overrideConfig.headers : {}
  );
  config.params = Object.assign(
    {},
    baseAxiosConfig.params,
    overrideConfig ? overrideConfig.params : {}
  );
  return config;
}
