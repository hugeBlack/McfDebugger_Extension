# Minecraft Function Debugger

![McFD图标](https://i.loli.net/2021/02/16/r72daAqgbLXKOVU.png)

Languages:

English / [简体中文](https://github.com/hugeBlack/McfDebugger_Extension/README_zh_cn.md)

## Intoduction

Minecraft Function Debugger (VSCode Extension Part), McFD for short, is a vscode extension that provides support for debugging Minecraft functions. You can use it to debug mcfunctions like debugging other languages

To use this extension, you MUST install [the corresponding Fabric mod](https://github.com/hugeBlack/McfDebugger_Mod), which enables it to comunicate with the game.

## Features

* Create / Remove breakpoints
* Run line by line
* Stop and see the exception when one is thrown
* See the output of any command
* See the environment of current function(position,entity,etc.)
* See the current call stack
* Get information of entities and scoreboard objectives
* Reload the datpack when restarting debug

## Quick Start

1. Open an datapack workspace.  
   Note: the directory structure should at least contain the "data" folder.
2. Open the "run" panel and create a "launch.json".
3. Default settings should be filled automatically. If it didn't, please specify a port, which is 1453 by default, and the debug type should be "mcf".  
   If you have already changed the port in game, please also change it here manually.
4. Click "Start Debugging" and enjoy.
5. Warning: **DO NOT use "step out" and "step over" functions yet because they WILL cause problems**(e.g. Your game may freeze forever)！These two functions may come in the future.

## Usage

Now you are using VSCode. Obviously, you know basic steps of debugging (creating breakpoints and run by step, for example). So I won't repeat it here.

Here are introduction of the"debugger command"。

they are commands begin with "#@". They are intentionally designed like that so that thay won't influene much even if you forget to remove them before releasing your datapack. They are as follows：

### #@loud
  
  By using this command, you can force a command to output its result as an exception. Using this command will cause the game to freeze. You can use it like this:

  `1 #@loud`

  `2 fill ~-1 ~ ~-1 ~1 ~ ~1`

  When executing the fill command, the debugger will **freeze** the game and output the result as an exception.

### #@log

  This command will output the command result but **keep the game running**. You can use it like this:

  `1 #@log`

  `2 fill ~-1 ~ ~-1 ~1 ~ ~1`

  When executing the fill command, the debugger will  output the result in the debug console.

### #@mute

  This command will tell the debugger to ignore any exception the next command threw. You can use it like this:

  `1 #@mute`

  `2 kill Huge_Black`

  Generally speaking, the player Huge_Black doesn't exist in you game. So the game will throw a "entity not found" exception. But because the #@mute, the debugger will ignore it whatsoever and will not freeze the game. But if you put a breakpoint, the breakpoint will still be hit despite the #@mute.

### #@getScoreboard

  This command can be used to freeze the game and output scoreboard information:

  `#@getScoreboard byEntity <Selector/Fake Player>`

  will output all scores the entity selected by the selector or "fake player" hold.

  `#@getScoreboard byObjective <Objective Name>`

  will get all scores the corresponding objective holds.

### #@getEntity

  This command is used to get some information of the selected entity.

  `#@getEntity <Selector>`

Note: **corresponding exceptions will be thrown if errors occurred when executing debugger commands**.

If you are still here, I apologize for my poor English.
