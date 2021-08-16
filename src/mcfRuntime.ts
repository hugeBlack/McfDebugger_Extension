import { EventEmitter } from 'events';
import { workspace ,window} from 'vscode';
let Path = require('path');
let fs = require('fs');
import * as WebSocket from "ws";
import {lang} from "./language";
export interface FileAccessor {
	readFile(path: string): Promise<string>;
}

export interface IMockBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}

interface IStepInTargets {
	id: number;
	label: string;
}

interface IStackFrame {
	index: number;
	name: string;
	file: string;
	line: number;
	column?: number;
}

interface IStack {
	count: number;
	frames: IStackFrame[];
}

/**
 * A Mock runtime with minimal debugger functionality.
 */
export class McfRuntime extends EventEmitter {

	// the initial (and one and only) file we are 'debugging'
	private _sourceFile: string = '';
	private _sourceFiles: any;
	public get sourceFile() {
		return this._sourceFile;
	}
	public debuggerMode:string="normalDebug";
	// the contents (= lines) of the one and only file
	private _sourceLines: string[] = [];
	private _functionPathList: any[] = [];
	// This is the next line that will be 'executed'
	private _currentLine = 0;
	private _currentColumn: number | undefined;
	public _variables:any;
	// maps from sourceFile to array of Mock breakpoints
	private _breakPoints = new Map<string, IMockBreakpoint[]>();

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1;
	
	private _breakAddresses = new Set<string>();

	private _noDebug = false;

	private _namedException: string | undefined;
	private _otherExceptions = false;

	private _datapackPathList:string[]=[];

	constructor(private _fileAccessor: FileAccessor) {
		super();
	}
	public _exceptionId:string="";
	public _exceptionName:string="";
	public _exceptionMsg:string="";

	/**
	 * "Step into" for Mock debug means: go to next character
	 */
	public async stepIn(targetId: number | undefined) {
		if(this.debuggerMode!="byStep"){
			this.debuggerMode="byStep";
			this.client.send('{"command":"setMode","mode":"byStep"}')
		}
		this.client.send('{"command":"next"}');
	}

	/**
	 * "Step out" for Mock debug means: go to previous character
	 */
	public stepOut() {
		this.stepIn(114);
	}


	public getStepInTargets(frameId: number): IStepInTargets[] {

		const line = this._sourceLines[this._currentLine].trim();

		// every word of the current line becomes a stack frame.
		const words = line.split(/\s+/);

		// return nothing if frameId is out of range
		if (frameId < 0 || frameId >= words.length) {
			return [];
		}

		// pick the frame for the given frameId
		const frame = words[frameId];

		const pos = line.indexOf(frame);

		// make every character of the frame a potential "step in" target
		return frame.split('').map((c, ix) => {
			return {
				id: pos + ix,
				label: `target: ${c}`
			};
		});
	}


	/**
	 * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	public _nowFile:string="";
	public langMap=lang.getLangMap();
	public getText(key:string):string{
		var t= this.langMap.get(key)
		if(typeof t != "undefined"){
			return t
		}else{
			return "unknowTranslable."+key;
		}
	}
	public stack(stackObj:any[]): IStack {
		var frames:any[]=[]
		frames.push({
			index: this._nowFile,
			name: this._nowCmd,
			file: this._nowFile,
			line: this._currentLine
		})
		stackObj.reverse().forEach((element,index) => {
			if(typeof element.value=="undefined"){
				frames.push({
					index: index,
					name: "Called somewhere.",
					file: this._nowFile,
					line: this._currentLine
				})
			}else{
				frames.push({
					index: index,
					name: element.value.cmdContent,
					file: this.findFileFromFunction(element.value.funNamespace, element.value.funPath).path,
					line: element.value.cmdIndex
				})
			}
			
		});
		return {
			frames: frames,
			count: 1
		};
	}
	public _nowCmd:string="";
	public getBreakpoints(path: string, line: number): number[] {

		const l = this._sourceLines[line];

		let sawSpace = true;
		const bps: number[] = [];
		for (let i = 0; i < l.length; i++) {
			if (l[i] !== ' ') {
				if (sawSpace) {
					bps.push(i);
					sawSpace = false;
				}
			} else {
				sawSpace = true;
			}
		}

		return bps;
	}

	/*
	 * Set breakpoint in file with given line.
	 */
	public async setBreakPoint(path: string, line: number): Promise<IMockBreakpoint> {

		const bp: IMockBreakpoint = { verified: false, line, id: this._breakpointId++ };
		let bps = this._breakPoints.get(path);
		if (!bps) {
			bps = new Array<IMockBreakpoint>();
			this._breakPoints.set(path, bps);
		}
		bps.push(bp);

		await this.verifyBreakpoints(path);

		return bp;
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(path: string, line: number): IMockBreakpoint | undefined {
		const bps = this._breakPoints.get(path);
		if (bps) {
			const index = bps.findIndex(bp => bp.line === line);
			if (index >= 0) {
				const bp = bps[index];
				bps.splice(index, 1);
				return bp;
			}
		}
		return undefined;
	}

	/*
	 * Clear all breakpoints for file.
	 */
	public clearBreakpoints(path: string): void {
		this._breakPoints.delete(path);
	}

	/*
	 * Set data breakpoint.
	 */
	public setDataBreakpoint(address: string): boolean {
		if (address) {
			this._breakAddresses.add(address);
			return true;
		}
		return false;
	}

	public setExceptionsFilters(namedException: string | undefined, otherExceptions: boolean): void {
		this._namedException = namedException;
		this._otherExceptions = otherExceptions;
	}

	/*
	 * Clear all data breakpoints.
	 */
	public clearAllDataBreakpoints(): void {
		this._breakAddresses.clear();
	}

	// private methods

	private async loadSource(): Promise<void> {
		var workspaceUri:string="";
		if(workspace.workspaceFolders){
			workspaceUri=workspace.workspaceFolders[0].uri.toString().replace(`file:///`,"").replace(/[/]/g,'\\').replace(/%3A/g,":").replace(/%20/g," ");
			
		}else{
			this.sendEvent("end");
			return;
		}
		this._sourceFiles = await this.getDirTree(workspaceUri)
	}
	public client:WebSocket=new WebSocket("ws://127.0.0.1");

	public continue(sth?:boolean){
		if(this.debuggerMode=="byStep"){
			this.debuggerMode="normalDebug";
			this.client.send(`{"command":"setMode","mode":"normalDebug"}`);
		}
		this.client.send('{"command":"next"}');
	}
	public step(sth?:boolean){
		this.stepOut();
	}

	public dataVersion:number=5;
	public versionChecked:boolean=false;

	public async start(port:number,features:Array<string>){
		this._functionPathList=[];
		this._datapackPathList=[];
		this._breakPoints
		await this.loadSource();
		//console.warn(this._sourceFiles);
		//console.warn(this._datapackPathList);
		//console.warn(this._functionPathList);
		this.client=new WebSocket("ws://127.0.0.1:"+port,{handshakeTimeout:2000});
		var msgObj:any;
		this.client.on("open",()=>{
			this.client.send(`{"command":"getVersion"}`);
			this.client.send(`{"command":"setMode","mode":"normalDebug"}`);
			this.debuggerMode="normalDebug";
			this.client.send(`{"command":"reload"}`);
			this.client.send(`{"command":"next"}`);
			this.client.send(JSON.stringify({command:"setFeatures",features:features}))
			this.sendEvent("output",this.getText("connected"), this._sourceFile, 1,1)
			this.sendBp()
		});
		this.client.on("error",(error)=>{
			this.sendEvent("output",error, this._sourceFile, 1,1);
			window.showErrorMessage(this.getText("connect_failed"));
			this.sendEvent('end');
		})
		this.client.on("message",(data)=>{
			console.warn(data);
			msgObj=JSON.parse(data.toString());
			if(msgObj.msgType=="versionResult"){
				if(parseInt(msgObj.bodyObj)!=this.dataVersion){
					window.showErrorMessage(parseInt(msgObj.bodyObj)>this.dataVersion?this.getText("outdated_extension"):this.getText("outdated_mod"));
					this.sendEvent('end');
				}else{
					this.versionChecked=true;
				}
			}else if(!this.versionChecked){
				window.showErrorMessage(this.getText("outdated_mod"));
				this.sendEvent('end');
			}
				
			switch(msgObj.msgType){
				case "errorCommandReport":
					this.functionProcess(msgObj);
					this._variables=msgObj.bodyObj.source;
					var exceptionArr=msgObj.bodyObj.exception.split(": ");
					if(exceptionArr[1]=="MCFDEBUGGER"){
						this._exceptionId=this.getText("debugger_info");
						this._exceptionName=""
					}else{
						this._exceptionId=exceptionArr[0];
						this._exceptionName=exceptionArr[1]
						this._exceptionMsg="";
						this.sendEvent("warn",msgObj.bodyObj.exception, this._nowFile, msgObj.bodyObj.cmdIndex,0)
					}
					
					this.sendEvent("stopOnException");
					break;
					case "nonStopErrorCommandReport":
						this.functionProcess(msgObj);
						this._variables=msgObj.bodyObj.source;
						var exceptionArr=msgObj.bodyObj.exception.split(": ");
						this.sendEvent("warn",msgObj.bodyObj.exception, this._nowFile, msgObj.bodyObj.cmdIndex,0);
						break;
				case "commandReport":
					if(msgObj.bodyObj.pause){
						this.functionProcess(msgObj);
						var funFile = this.findFileFromFunction(msgObj.bodyObj.funNamespace, msgObj.bodyObj.funPath)
						this._variables=msgObj.bodyObj.source;
						if(this.debuggerMode=="byStep"){
							this.sendEvent('stopOnStep');
						}else{
							var hitBp: IMockBreakpoint | any;
							try {
								this._breakPoints.forEach((bps, key) => {
									if (key == funFile.path) {
										bps.every((bp) => {
											if (bp.line == msgObj.bodyObj.cmdIndex) {
												hitBp = bp;
												return false;
											}
											return true;
										})
										throw 1;
									}
								})
							} catch (e) { }
							if (hitBp) {
								this.sendEvent('stopOnBreakpoint');
								this.sendEvent("output", this.getText("breakpoint_hit"), this._nowFile, msgObj.bodyObj.cmdIndex, 0)
							}
						}
						
					}
					break;
				case "getScoresResultByObjective":
					this._exceptionMsg=this.transferTreeView(msgObj.bodyObj,this.getText("result_by_objective"))
					break;
				case "getScoresResultByEntity":
					this._exceptionMsg=this.transferTreeView(msgObj.bodyObj,this.getText("result_by_entity"))
					break;
				case "stackReport":
					this._stackObj=msgObj.bodyObj
					break;
				case "getEntityResult":
					this._exceptionMsg=this.transferTreeView(msgObj.bodyObj,this.getText("get_result_entity"))
					break;
				case "loudResult":
					this._exceptionMsg=`${this.getText("command_output")}:${msgObj.bodyObj.value}`;
					break;
				case "logResult":
					var a=this.findFileFromFunction(msgObj.bodyObj.value.value.funNamespace,msgObj.bodyObj.value.value.funPath)
					if(a!=0){
						this._nowFile=a.path;
					}
					this._nowCmd=msgObj.bodyObj.value.value.cmdContent;
					this._currentLine=msgObj.bodyObj.value.value.cmdIndex;
					this.sendEvent("output", msgObj.bodyObj.value.key, this._nowFile, this._currentLine, 0)
					break;
				case "functionSyntaxError":
					this.sendEvent("warn", msgObj.bodyObj.errorMsg, this.findFileFromFunction(msgObj.bodyObj.namespace,msgObj.bodyObj.path).path, parseInt(msgObj.bodyObj.cmdIndex), 0)
					break;
			}
		})
		
	}
	public _stackObj:any[]=[];
	public sendBp(){
		var sendBreakPointList:any[]=[];
		this._breakPoints.forEach((bps,fileName,m)=>{
			var nameArr:string[]=fileName.split("\\");
			var funPath:string=nameArr[nameArr.length-1].split(".")[0];
			var funNameSpace:string='';
			for(var i=nameArr.length-2;i>0;i--){
				if(nameArr[i]!="functions"){
					funPath=nameArr[i]+"\\"+funPath;
				}else{
					funNameSpace=nameArr[i-1];
					break;
				}
			}
			bps.forEach((bp)=>{
				sendBreakPointList.push({funNamespace:funNameSpace,funPath:funPath,cmdIndex:bp.line})
				bp.verified=true;
				this.sendEvent('breakpointValidated', bp);
			})
		})
		this.client.send(JSON.stringify({command:"setPauseList",pauseList:sendBreakPointList}))
	}
	

	public functionProcess(msgObj:any){
			var a=this.findFileFromFunction(msgObj.bodyObj.funNamespace,msgObj.bodyObj.funPath)
			if(a!=0){
				this._nowFile=a.path;
			}
			this._nowCmd=msgObj.bodyObj.cmdContent;
			this._currentLine=msgObj.bodyObj.cmdIndex;
		}


	private async verifyBreakpoints(path: string): Promise<void> {

		if (this._noDebug) {
			return;
		}

		const bps = this._breakPoints.get(path);
		if (bps) {
			await this.loadSource();
			bps.forEach(bp => {
				bp.verified = true;
				this.sendEvent('breakpointValidated', bp);
			});
			
		}
	}

	

	public sendEvent(event: string, ... args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}

	private addSubDir(dir: any, subDir: any) {
        if (subDir) dir.subDirs.push(subDir);
    }
	private addFile(dir:any,file:any,path:any){
		if(file.isFile()) {
			if(/.mcfunction/g.test(file.name)){
				var lines: string[] = fs.readFileSync(decodeURIComponent(path + "\\" + file.name), 'utf-8').split("\r\n");
				dir.files.push({
					name: file.name,
					contents: lines
				});
				this._functionPathList.push({path:path + "\\" + file.name,contents:lines})
			}else if(file.name=="pack.mcmeta"){
				this._datapackPathList.push(path);
			}
			
		}
	}

    public async getDirTree(path: string) {
		path=decodeURIComponent(path);
        if (fs.lstatSync(path).isDirectory()) {
            let temp = path.split('\\');
            let res: any = {
                dirName: temp[temp.length - 1],
                subDirs: [],
				files:[]
            }
            let dir = await fs.promises.opendir(path);
            for await (let dirent of dir) {
                this.addSubDir(res, await this.getDirTree(Path.join(path, dirent.name)));
            }
			let fileList = await fs.promises.readdir(path,{withFileTypes:true});
			for await (let file of fileList) {
                this.addFile(res,file,path);
            }
            return res;
        } else {
            return null;
        }
    }

	public findFileFromFunction(namespace:string,funPath:string):any|number{
		var funObj:any=0
		try{
		this._functionPathList.forEach((value)=>{
					if(value.path.indexOf(namespace+"\\functions\\"+funPath)!=-1){
						funObj=value;
						throw 1;
					}
				})
		}catch(e){}
		return funObj;
	}

	public transferTreeView(obj:any,title:string="Root"):string {
		var msg = "";
		s(obj, title, "");
		function s(obj:any, nowkey:string, nowSpace:string) {
			var type=Object.prototype.toString.call(obj);
			if (type == '[object Object]') {
				msg+=nowSpace + nowkey + ":"+"\n"
				for (var key in obj) {
					s(obj[key], key, nowSpace + "  ");
				}
			} else if(type=="[object Array]"){
				msg+=`${nowSpace}${nowkey} [${obj.length}]:\n`
				obj.forEach((element: any,index:number) => {
					s(element, index.toString(), nowSpace + "  ")
				});
			}else{
				msg+=nowSpace + nowkey + ":" + obj+"\n"
			}
		}
		return msg;
	}
}
