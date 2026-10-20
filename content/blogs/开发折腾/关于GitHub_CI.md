## 前言
今天因为想要分发多个平台的安装包，所以学习了怎么用CI自动创建release

## 具体的用法
1. 当然也是跟部署GitHub page是一个道理，本质都是使用GitHub action来跑一些脚本，同样是在.github/workflow里面创建yaml文件，写好比如说macos，linux的一些代码
2. 然后yaml文件里面会有一个tag标签，需要确保这个标签存在，不然不会出现在release里面，具体就是在release里面create新的tag
3. 最好是先改yaml文件，然后再更新release tag，一更新就会自动跑action

剩下还有什么的话，我还会补充的