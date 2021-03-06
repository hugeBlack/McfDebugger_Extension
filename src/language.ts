import * as vscode from 'vscode';
export class lang{
    public static getLangMap():Map<string,string>{
        var langMap:Map<string,string>=new Map<string,string>();
        var lang = vscode.workspace.getConfiguration("mcfdebugger").get("display_language")
        switch(lang){
            case "zh_cn":
                langMap.set("connected","已连接到调试器。");
                langMap.set("connect_failed","无法连接到调试器Websocket服务器。");
                langMap.set("outdated_extension","过时的插件，请升级你的插件。");
                langMap.set("outdated_mod","过时的模组，请升级你的模组");
                langMap.set("debugger_info","调试器信息");
                langMap.set("result_by_objective","根据计分板的结果");
                langMap.set("result_by_entity","根据实体的结果");
                langMap.set("get_result_entity","获取的实体信息");
                langMap.set("command_output","指令输出")
                break;
            default:
                langMap.set("connected","Debugger Connected");
                langMap.set("connect_failed","Can not connect to the debug Websocket server.");
                langMap.set("outdated_extension","Outdated extension. Please Update your extension.");
                langMap.set("outdated_mod","Outdated mod. Please Update your mod.");
                langMap.set("debugger_info","Debugger Info");
                langMap.set("result_by_objective","Result By Objective");
                langMap.set("result_by_entity","Result By Entity");
                langMap.set("get_result_entity","Get Result Entity");
                langMap.set("command_output","Command output")
                break;
        }
        return langMap;
    }
}
