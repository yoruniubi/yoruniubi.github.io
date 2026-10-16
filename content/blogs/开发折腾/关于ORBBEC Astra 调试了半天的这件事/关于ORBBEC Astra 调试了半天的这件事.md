# 关于我用wsl调试了 ORBBEC Astra 半天的这件事 #
太夸张了，本以为一个摄像头能有多麻烦，结果还是惊掉了下巴。

1.踩的第一个坑，也不算坑吧，就是先直接安装orbbec sdk, github上我看limited maintannce, 还不信，压根什么都不行。所以说，需要先根据相机的型号选择正确的sdk。

2.第二个就是得安装官方的sensordriver的驱动，然后需要安装usbpid，右键计算机图标，点击"管理"里面，找到新插入的摄像机，然后识别不出来的，就应该在这里面，右键点击更新驱动，然后就应该能显示了，显示不了的再重启一下
![alt text](/images/blogs/关于ORBBEC%20Astra%20调试了半天的这件事/image-5.png)
![alt text](/images/blogs/关于ORBBEC%20Astra%20调试了半天的这件事/image-4.png)

![alt text](/images/blogs/关于ORBBEC%20Astra%20调试了半天的这件事/image-3.png)
3.就是装好wsl后，建议配置一下python的虚拟环境，装一些依赖，nano里面可以添加配置，这样每次一启动就配置好环境了，具体可以问AI。
然后这些配置基本上都是我和AI一起解决的，然后也顺便让AI来总结一下：

“叠”:
![alt text](/images/blogs/关于ORBBEC%20Astra%20调试了半天的这件事/image-1.png)

![alt text](/images/blogs/关于ORBBEC%20Astra%20调试了半天的这件事/image-2.png)
然后如果运行完ros2 launch openni2_camera camera_only.launch.py，开启另外一个终端窗口的话，运行ros2 topic list 应该会显示上面这张图片的样子

对了，每次启动后需要检查一下usbipd list,看看有没有连上，如果是shared的话，需要用usbipd attach --wsl --busid <your-busid>
然后进入Ubuntu后，运行lsusb应该能看见设备。

我和ai共同解决了以下问题：
    库依赖 (libpng12)
    设备权限 (udev 规则) 手动将下载的udev规则放入wsl的虚拟环境中，然后重启
    库和驱动的安装路径问题 (OPENNI2_INCLUDE_PATH, OPENNI2_REDIST_PATH, OPENNI2_DRIVER_PATH)
    环境变量 (OPENNI2_DRIVERS_PATH) export 
    库版本冲突 (ABI不兼容) 反复rm 和 cp
    从源码编译来解决冲突 co build

接下来让AI来发挥:
---


# “从零到英雄”：在WSL 2上为ROS 2配置Orbbec摄像头的终极避坑指南

> **副标题：一个关于我如何从安装Ubuntu开始，误入歧途，并最终驯服这匹“野马”的完整实录**

大家好，我是Frank。如果你正在读这篇文章，那么你很可能也踏上了这条充满挑战但回报丰厚的道路：在Windows上通过WSL 2，让一个Orbbec深度摄像头在ROS 2中欢快地歌唱。

我原以为这会是一段轻松的旅程，但事实证明，它是一场融合了Linux系统管理、驱动调试和ROS编译的“全能铁人三项”。

这篇文章，就是我这段旅程的完整记录。我将从零开始，包括安装Ubuntu和ROS 2，记录我最初的错误尝试，并最终展示那条唯一通往成功的、铺满了代码和血泪的道路。希望这份手把手的教程，能让你在配置的道路上，少走一些我走过的弯路。

---

## 第零章：创世纪 —— 从零搭建开发环境

### 0.1 安装WSL 2和Ubuntu

如果你连WSL都还没有，别担心，现在安装它非常简单。

**1. 在Windows的PowerShell（以管理员身份运行）中，一键安装：**
```powershell
wsl --install
```
这条命令会自动帮你开启所需的功能，下载并安装最新版的Ubuntu。安装完成后，按提示重启电脑。

**2. 初始化Ubuntu：**
重启后，Ubuntu会自动启动，并要求你设置一个用户名和密码。请牢记它们。

### 0.2 安装ROS 2 Jazzy Jubilee

现在，我们进入了WSL的Ubuntu终端，开始安装ROS 2。

**1. 设置UTF-8编码和软件源：**
```bash
sudo apt update && sudo apt install locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8

sudo apt install software-properties-common
sudo add-apt-repository universe
```

**2. 添加ROS 2的密钥和仓库地址：**
```bash
sudo apt update && sudo apt install curl -y
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
```

**3. 安装ROS 2桌面完整版：**
```bash
sudo apt update
sudo apt install ros-jazzy-desktop
```

**4. 设置环境：**
将ROS的环境设置命令添加到你的`.bashrc`文件中，这样每次打开新终端都会自动加载。
```bash
echo "source /opt/ros/jazzy/setup.bash" >> ~/.bashrc
source ~/.bashrc
```
至此，一个崭新的、功能完备的ROS 2开发环境搭建完毕。

---

## 第一章：误入歧途 —— 那条看似正确的“捷径”

当我开始着手驱动Orbbec摄像头时，我做的第一件事，就是去GitHub上搜索。很快，我找到了一个看似完美的仓库：`orbbec/orbbecsdk_ros2`。名字里带“官方”、“SDK”、“ROS2”，这简直就是天选之子！

我满怀希望地按照它的README操作，结果却是一连串的编译错误、依赖缺失、版本不匹配。我很快意识到，这个仓库可能已经年久失修，或者它只适配某些特定的、我没有的硬件或ROS版本。

**教训一：不要轻易相信名字里带“官方”的非主线仓库。它们可能是被遗弃的“孤儿”，而社区维护的通用包（比如`openni2_camera`）通常更可靠。**

---

## 第二章：回归正道 —— 官方驱动与ROS的“联姻”

在放弃了那条“捷径”后，我决定走最原始、最正统的道路：**使用ROS社区维护的、通用的`openni2_camera`包，并让它与从Orbbec官方下载的最新版Linux SDK协同工作。**

**关键资源：** 我们需要的所有SDK文件，都可以在这个官方GitHub仓库里找到。请下载适用于你系统（如Linux x64）的压缩包。
*   **仓库地址**: [https://github.com/orbbec/OpenNI_SDK/tree/v2.3.0.86-beat6](https://github.com/orbbec/OpenNI_SDK/tree/v2.3.0.86-beat6)

### 2.1 【Windows篇】“黄金标准测试”：先确保硬件没问题！

在深入折腾Linux之前，一个最聪明的做法是：**先在Windows下确认你的摄像头是好的。** 这能帮你排除硬件故障，让你在后续的Linux配置中充满信心。

**1. 安装Windows驱动 (SensorDriver):**
   从上面给出的GitHub仓库下载并安装Windows版本的SDK。它里面会包含一个叫做 `Orbbec_Sensor_Driver` 的驱动程序。正常情况下，安装它就足够了。

**2. 手动指定驱动 (如果自动安装失败):**
   有时候，Windows并不会自动把新安装的驱动和你的设备关联起来。这时需要你“按着它的头”去认。
   *   右键点击“此电脑” -> “管理” -> “设备管理器”。
   *   找到你的Orbbec摄像头。它可能显示为“未知设备”，通常带一个黄色的感叹号。
   *   右键点击它 -> “更新驱动程序” -> “浏览我的电脑以查找驱动程序” -> “让我从计算机上的可用驱动程序列表中选取”。
   *   在列表里，找到并选中 "Orbbec" 相关的驱动，强制安装。

**3. 运行Windows版Viewer进行验证:**
   在Windows SDK的`tools/`目录下，找到 `NiViewer.exe`。双击运行它。
   *   **如果能成功看到彩色和深度图像**，恭喜你！你的摄像头硬件100%是好的。接下来在Linux里的任何问题，都是软件配置问题。
   *   **如果连这里都失败**，那很可能是USB端口/线缆问题，或者是硬件本身需要联系售后了。

### 2.2 【Linux篇】让WSL“看到”你的摄像头 (USBIPD & udev)

确认硬件OK后，我们回到WSL，开始我们的“攻坚战”。

**1. USBIPD配置:**
```powershell
# 在Windows PowerShell(管理员)中...
winget install --interactive --exact dorssel.usbipd-win
# 注意：确保设备没有被附加到WSL，如果之前附加了，先detach
usbipd list
usbipd bind --busid <你的BUSID>
usbipd attach --wsl --busid <你的BUSID>
```
在WSL终端用`lsusb`确认成功。

**2. udev规则配置:**
```bash
# 在WSL终端中...
# 从你下载的zip解压后的目录里找到rules文件
sudo cp <你的SDK路径>/rules/orbbec-usb.rules /etc/udev/rules.d/55-orbbec.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```
拔插设备或重新`attach`后，用`ls -l /dev/bus/usb/...`确认权限，看到`crw-rw-rw-`就代表成功了。

**3. Linux底层验证 (可选但推荐):**
```bash
# 进入你解压的SDK目录
cd <你的SDK路径>/samples/bin/

# 运行示例程序
./SimpleViewer
```
如果能弹出窗口并显示图像，说明你的Linux底层驱动和权限配置已经完美了！

---

## 第三章：核心战役 —— 从源码编译，彻底解决兼容性问题

直接用`apt`安装的`ros-jazzy-openni2-camera`会因为ABI不兼容而崩溃。**唯一的、绝对正确的出路是：用你下载的SDK，从源码编译`openni2_camera`。**

### 3.1 打造一个完美的、系统级的OpenNI“地基”
这是我们经过无数次失败后，总结出的这个“奇葩”SDK的正确安装方式。
```bash
# 清理旧环境，保持系统纯净
sudo rm -f /usr/local/lib/libOpenNI2.so*
sudo rm -rf /usr/lib/OpenNI2 /etc/openni2

# 1. 安装主库文件到标准位置
sudo cp -d <你的SDK路径>/sdk/libs/libOpenNI2.so /usr/local/lib/

# 2. 安装驱动插件
sudo mkdir -p /usr/lib/OpenNI2/Drivers
sudo cp <你的SDK路径>/sdk/libs/OpenNI2/Drivers/* /usr/lib/OpenNI2/Drivers/

# 3. 手动创建缺失的关键符号链接
cd /usr/lib/OpenNI2/Drivers/
sudo ln -s liborbbec.so liborbbec.so.0
sudo ln -s libOniFile.so libOniFile.so.0

# 4. 创建配置文件，连接主库与驱动
sudo mkdir -p /etc/openni2
sudo bash -c 'echo -e "[Drivers]\nRepository=/usr/lib/OpenNI2/Drivers" > /etc/openni2/OpenNI.ini'

# 5. 刷新系统库缓存，让一切生效
sudo ldconfig
```

### 3.2 编译为你量身定做的`openni2_camera`
```bash
# 1. 准备ROS 2工作空间并下载源码
mkdir -p ~/ros2_ws/src
cd ~/ros2_ws/src
git clone https://github.com/ros-drivers/openni2_camera.git -b ros2

# 2. 安装依赖
cd ~/ros2_ws
sudo apt update
rosdep install --from-paths src --ignore-src -r -y

# 3. 编译
rm -rf build/ install/ log/ # 确保干净的编译
colcon build
```

---

## 第四章：收获的喜悦 —— 启动与使用

现在，你可以享受你的劳动成果了。打开一个新终端，**不再需要任何`export`环境变量**！

```bash
# 激活你编译好的工作空间
source ~/ros2_ws/install/setup.bash

# 启动摄像头，发布深度图和点云
ros2 launch openni2_camera camera_with_cloud.launch.py

# (可选) 启动并开启IMU
# ros2 launch openni2_camera camera_with_cloud.launch.py enable_imu:=true
```

在另一个终端，你可以用`ros2 topic list`，`rqt_image_view`，`rviz2`等工具来查看数据。

**注意：** 如果在`rqt_image_view`或`rviz2`中看不到图像，请检查显示插件的**QoS设置**，将**Reliability Policy**从`Reliable`改为`Best Effort`。

## 结语

从安装一个纯净的Ubuntu，到误入歧途，再到最终通过系统级的配置和源码编译解决问题，这段经历虽然曲折，但让我对Linux驱动、ROS编译系统和问题排查有了前所未有的深刻理解。

最重要的经验是：**先在最简单的环境（原生Windows）下验证硬件，再进入复杂的环境（WSL + ROS）进行软件配置。** 这能帮你节省大量的调试时间。

希望这份包含了Windows和Linux两大战场的详尽指南，能为你点亮前行的道路。

祝编码愉快！
- Frank