<!-- lang zh-CN begin -->
# 锁定基站静态 IP

> POST `API_ADDRESS`/`PREFIX`/lock-static-ip

## 参数

| 名称 | In | 可选 | 简介 |
|---|---|---|---|
| json | body | NO | JSON Body |

## HTTP 状态码

| 状态码 | 简介 | Body |
|---|---|---|
| 200 | 成功 | Empty |
| 400 | 失败 | Error Message |

## JSON Body 结构
```ts
export interface IBody {
  mac: string; // 基站 MAC
}
```

## 示例
<!-- lang zh-CN end -->

<!-- lang en-US begin -->
# Lock locator static IP

> POST `API_ADDRESS`/`PREFIX`/lock-static-ip

## Params

| Name | In | Optional | Description |
|---|---|---|---|
| json | body | NO | JSON Body |

## HTTP status code

| Code | Description | Body |
|---|---|---|
| 200 | OK | Empty |
| 400 | Failed | Error Message |

## JSON Body structure
```ts
export interface IBody {
  mac: string; // Locator MAC
}
```

## Example
<!-- lang en-US end -->

> POST http://localhost:44444/locators/lock-static-ip
```json
{
	"mac": "3c:fa:d3:b0:77:ef"
}
```

> 200
```json
```
