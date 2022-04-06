import {Application, Router} from 'oak'
import {Bot} from 'grammy'

const app = new Application()
const router = new Router()
const TG_BOT = Deno.env.get('TG_BOT')!
const ME = Deno.env.get('ME')!

const bot = new Bot(TG_BOT)

bot.on('message', ctx => {
  ctx.reply(`Copy: ${ctx.message.text}`)
})

bot.start()

function sendMessage(raw: string, to: string | number = ME) {
  bot.api.sendMessage(to, raw, {parse_mode: 'HTML'})
}

function encode(raw: string) {
  return raw
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('&', '&amp;')
}

router.post('/webhook', async ctx => {
  interface Data {
    line_items?: Array<{
      title: string
      quantity: number
      price: string
      price_set: {
        shop_money: {
          currency_code: string
        }
      }
    }>
    email?: string
    currency?: string
    name?: string
    cancel_reason?: string
    total_price?: string
  }
  const data: Data = await ctx.request.body({type: 'json'}).value.catch(() => null)
  if (!data) return ctx.response.body = 'Whoops!'

  const topic = ctx.request.headers.get('X-Shopify-Topic')
  const domain = ctx.request.headers.get('X-Shopify-Shop-Domain')

  switch (topic) {
    case 'carts/update': {
      sendMessage(data.line_items!.map(item => {
        return `商品: <a href="https://${domain}/products/${encodeURIComponent(item.title)}">${encode(item.title)}</a> 数量: ${item.quantity} 单价: ${item.price}${item.price_set.shop_money.currency_code}`
      }).join('\n'))
      break
    }

    case 'order/paid': {
      sendMessage([
        '<b>付款订单</b>',
        `邮箱: ${data.email}`,
        `金额: ${data.total_price}${data.currency}`,
        `退款理由(?): ${data.cancel_reason}`
      ].join('\n'))
      break
    }
  }

  ctx.response.body = 'ok'
})

router.get('/', async ctx => {
  ctx.response.body = 'Hi, I\'m JetLu.'
})

app.use(router.allowedMethods())
app.use(router.routes())
app.listen({port: 8080})
