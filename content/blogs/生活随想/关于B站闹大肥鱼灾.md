## 前言
最近在B站看到了一堆人用deepseek自建账号，搁那刷B站回复评论，然后我就很好奇是怎么实现的,稍微调查了一下

---
## 关于怎么实现的

### 1. deepseek harness plugin：我看是有人搞的deepseek harness的一个插件，

link: https://github.com/c1overzz/dsh-bili-scroll

顺便说一下，plugin的底层原理，底层是Cordis 插件框架，准确来说根据搜索和自我总结如下：DeepSeek Harness（DSH）用 TypeScript 全栈构建，所以呢其插件以 typescript的形式分发，可以是一个ts文件，或者是npm包，并由 Cordis 框架在运行时统一管理。 

--- 
### 2. 还看到了一个项目，不仅仅是deepseek harness
link：https://github.com/public-clis/bilibili-cli

这个就是比较通用，底层是使用bilibili-api-python
,这个项目好像是逆向出来的，原仓库已经吃律师函了，总之就是
link: https://pypi.org/project/bilibili-api-python/

---
### 3. 关于做视频运营
说实话感觉效果真不错，不知道是怎么实现的，很好奇，希望之后能搞清楚，但是大抵依赖肯定有：
- mcp: bilibili-mcp
- bili-cli,cli工具
- 前面说的python库

---
## 结语
感觉AI发展的速度有点太快了，之前烦恼于如何做视频，如何运营，感觉都解决了啊，但感觉也有点像之前的openclaw，是火一段时间就沉寂了，毕竟token哪来的，肯定要money的呀，当然也不排除有钱多的人，天天烧token。