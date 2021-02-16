# Minecraft函数调试器

![McFD图标](https://i.loli.net/2021/02/16/r72daAqgbLXKOVU.png)

## 简介 / Intoduction

**简体中文**：

你还在为写函数的时候哪个指令没有执行而不知所措吗？你还在为调试而各种/say吗你还在为不知道哪个实体执行了function而一头雾水吗（跑

Minecraft Function Debugger (VSCode Extension Part)，简称 McFD，中文名「函数调试器(VSCode插件部分)」是一个能够为 Minecraft Java版的函数提供调试支持的VSCode插件，你可以使用它像调试其他语言一样调试mcfunction

若要使用此插件，你必须安装 [对应的Fabric模组](https://github.com/hugeBlack/McfDebugger_Mod) 来和游戏通信

**English**:  

Minecraft Function Debugger (VSCode Extension Part), McFD for short, is a vscode extension that provides support for debugging Minecraft functions. You can use it to debug mcfunctions like debugging other languages

To use this extension, you MUST install [the corresponding Fabric mod](https://github.com/hugeBlack/McfDebugger_Mod), which enables it to comunicate with the game.

## 特性 / Features

**简体中文**：

* 创建/取消断点
* 逐语句执行
* 在出现异常时暂停并查看异常
* 查看某条指令输出
* 查看当前函数执行环境(执行实体，位置等)
* 查看当前调用堆栈
* 获取实体/计分板信息
* 重启调试时自动重载数据包

**English**：

* Create / Remove breakpoints
* Run line by line
* Stop and see the exception when one is thrown
* See the output of any command
* See the environment of current function(position,entity,etc.)
* See the current call stack
* Get information of entities and scoreboard objectives
* Reload the datpack when restarting debug

## 用法/Usage

**简体中文**：

您正在使用VSCode，显然，您熟知基本的调试方法(创建断点，步过等)我们在此处不再赘述。

在这里介绍所谓「调试器指令」。

调试器指令是由#@开头的指令。我们这样设计，可以使得即便您忘记了在发布前删除，也不会造成太大的影响。它们是如下几个：

### #@loud
  
  该指令用于强制其下方的指令输出执行结果并暂停，像这样：

  `1 #@loud`

  `2 fill ~-1 ~ ~-1 ~1 ~ ~1`

  运行到fill指令的时候，调试器会**暂停**游戏并以异常的形式输出执行结果

### #@log

  该指令用于强制其下方的指令输出执行结果但**不暂停**，像这样：

  `1 #@log`

  `2 fill ~-1 ~ ~-1 ~1 ~ ~1`

  运行到fill指令的时候，调试器会在调试控制台中输出执行结果

### #@mute

  该指令用于使调试器忽略下方指令产生的错误，像这样：

  `1 #@mute`

  `2 kill Huge_Black`

  一般来说，玩家Huge_Black不在您的游戏中，所以这条指令会抛出"实体不存在"异常，但因为mute指令的存在，调试器会忽略这个错误且不暂停游戏

### #@getScoreboard

  该指令用于暂停并输出请求的计分板，语法如下：

  `#@getScoreboard byEntity <选择器/假名>`

  可获取对应选择器/假名的所有分数

  `#@getScoreboard byObjective <计分板名>`

  可获取指定计分板的所有记录的分数

### #@getEntity

  该指令用于暂停并输出选择器获得的实体的一些信息

  `#@getEntity <选择器>`

值得注意的是，**如果调试器指令语法错误也会抛出对应的异常**
 
在调试时，我们使用调试器指令来命令调试器进行以下操作

**English**：

Now you are using VSCode. Obviously, you know basic steps of debugging (creating breakpoints and run by step, for example). So I won't repeat it here.

Here are introduction of the"debugger command"。

they are commands begin with "#@". They are intentionally designed like that so that thay won't influene much even if you forget to remove them before releasing your datapack. They are as follows：

### #@loud
  
  该指令用于强制其下方的指令输出执行结果并暂停，像这样：

  `1 #@loud`

  `2 fill ~-1 ~ ~-1 ~1 ~ ~1`

  运行到fill指令的时候，调试器会**暂停**游戏并以异常的形式输出执行结果

### #@log

  该指令用于强制其下方的指令输出执行结果但**不暂停**，像这样：

  `1 #@log`

  `2 fill ~-1 ~ ~-1 ~1 ~ ~1`

  运行到fill指令的时候，调试器会在调试控制台中输出执行结果

### #@mute

  该指令用于使调试器忽略下方指令产生的错误，像这样：

  `1 #@mute`

  `2 kill Huge_Black`

  一般来说，玩家Huge_Black不在您的游戏中，所以这条指令会抛出"实体不存在"异常，但因为mute指令的存在，调试器会忽略这个错误且不暂停游戏

### #@getScoreboard

  该指令用于暂停并输出请求的计分板，语法如下：

  `#@getScoreboard byEntity <选择器/假名>`

  可获取对应选择器/假名的所有分数

  `#@getScoreboard byObjective <计分板名>`

  可获取指定计分板的所有记录的分数

### #@getEntity

  该指令用于暂停并输出选择器获得的实体的一些信息

  `#@getEntity <选择器>`

值得注意的是，**如果调试器指令语法错误也会抛出对应的异常**
 
在调试时，我们使用调试器指令来命令调试器进行以下操作
