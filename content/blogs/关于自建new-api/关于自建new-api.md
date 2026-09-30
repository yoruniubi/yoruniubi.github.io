# 前言
在L站逛多了之后发现，太多公益站不用确实有点可惜，而且我老早之前就有一个痛点想解决，**就是base_url和api_key的方便管理**，我发现new-api这个项目非常契合我的需求，即可以集中管理api_key又方便调用。但是本地docker部署的，每次都需要运行docker，打开localhost：3000才行，相当麻烦，所以我想要自行部署一个站点，方便自己使用。
# 步骤
**先叠个甲：我也是在ai的指导下完成的，有什么不明白的，还是问ai叠比较好**

## 1. 准备服务器
可以选择国内外比较有名的服务器，不管是付费的，像是：
![alt text](/images/blogs/关于自建new-api/image-8.png)
![alt text](/images/blogs/关于自建new-api/image-9.png)
或者是相对免费的：
![alt text](/images/blogs/关于自建new-api/image-10.png)
反正我是部署在huggingface的space上，不花一分钱
## 2. 初始化space或者是服务器

可以在AI的指导下，具体问题具体分析，我是直接用ai给的dockerfile文件(当然是支持docker的)，文本如下：
```
FROM calciumion/new-api:latest

# 1. 绕过 HF 的 /v1 拦截
ENV BASE_PATH=/hf

# 2. 端口配置
ENV PORT=7860
EXPOSE 7860

# 3. 环境变量同步域名（确保你已经做了 Cloudflare Worker 转发）
ENV GLOBAL_WEB_BASE_URL= 你的域名

ENTRYPOINT ["/new-api"]
```
## 3. 准备域名(可选)
域名就像是门牌号，有了显得更专业一些，而且可以托管在cloudflare上，更安全。
我是在这个链接：https://www.gname.com 上获得免费的域名，可以不可以免费续费我不知道，但是有一年的时间可以用
![alt text](/images/blogs/关于自建new-api/image-11.png)

选择**免费注册**就好了，然后根据相应的流程走

## 4. 准备数据库
我是使用**Neon数据库**，因为new-api需要后端数据库的支持，所以我们需要做相应的处理，相应的步骤也是可以问ai叠

最后如果顺利的话，应该可以看到你的域名已经有new-api的界面了
![alt text](/images/blogs/关于自建new-api/image-12.png)

# 最后
尽情往里面塞api_key吧
