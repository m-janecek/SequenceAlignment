loadModule("/TraceCompass/Trace");
loadModule('/TraceCompass/Analysis');
loadModule('/System/Resources');
loadModule('/TraceCompass/View');
loadModule('/TraceCompass/TraceUI');

var critPathPath = "workspace://Tracing/critPaths"; // folder in TraceCompass
var location = "kernel";
var traceName = "python_norm1"; // name of trace you want to examine
var followName = "python3"; // name of thread you want to examine
var critPathOut = createFile("critPath-" + traceName + ".txt"); // output file
critPathHandle = writeLine(critPathOut, "Critical Path State:Duration");


print("Start");
var location = traceName + "/kernel" ;
var trace = openTrace("Tracing", location, false);
if (trace == null) {
    print("Trace is null");
} else{
	getData(trace);
}

function getData(trace){
	events =  getEventIterator(trace);
	data = "";
	// Get Critical Path
	signal = new org.eclipse.tracecompass.analysis.os.linux.core.signals.TmfThreadSelectedSignal(this, 1, trace);
	org.eclipse.tracecompass.tmf.core.signal.TmfSignalManager.dispatchSignal(signal);
	analysis = getTraceAnalysis(trace, 'OS Execution Graph');
	analysis.schedule();
	analysis.waitForCompletion();
		
	osGraph = analysis.getGraph();
		
	//Find the tid of the targeted thread
	workers = osGraph.getWorkers();
	iter = workers.iterator();
	followTid = null;
	targetWorker = null;
	//linear search through each thread/worker until one with the matching name is found
	while(iter.hasNext()){
		worker = iter.next();
		info = worker.getWorkerInformation();
		name = worker.getName();
		if(name == followName){
		print("Thread found");
			info = worker.getWorkerInformation();
			tid = info.get('TID');
			followTid = tid;
			targetWorker = worker;
			
			print(tid);
			
			//Select the thread that we want the critical path of.
			signal = new org.eclipse.tracecompass.analysis.os.linux.core.signals.TmfThreadSelectedSignal(this, followTid, trace);
			org.eclipse.tracecompass.tmf.core.signal.TmfSignalManager.dispatchSignal(signal);
			analysis = new org.eclipse.tracecompass.analysis.os.linux.core.execution.graph.OsExecutionGraph();
			analysis.setTrace(trace);
			analysis.schedule();
			analysis.waitForCompletion();
			osGraph = analysis.getGraph();
			critPathMod = new org.eclipse.tracecompass.analysis.graph.core.criticalpath.CriticalPathModule(analysis);
			critPathMod.setTrace(trace);
			critPathMod.setParameter("workerid", targetWorker);
			critPathMod.schedule();
			critPathMod.waitForCompletion();
			
			critPath = critPathMod.getCriticalPath();
			if(critPath == null){
				print("Critical path not found");
				print(signal.getThreadId());
				    return;
			}
			workers = critPath.getWorkers();
			//get head of graph
			head = critPath.getHead();
			if(head == null){
				print("Critical path graph head not found");
				print(signal.getThreadId());
				    return;
			}
			next = head;
			critOutStr = "";
			
			//Get the ENUM of the edge directions
			edges =	org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.EdgeDirection.values();
			
			previous = null;
			//Loop for all nodes in graph
			while(next != null){
				vertex = next;
				vertical = false;
				worker = critPath.getParentOf(vertex);
				name = worker.getName();
				sTime = vertex.getTs();	
				
				info = worker.getWorkerInformation(sTime);
				tid = info.get('TID');
				//Find next vertex
				if(vertex.getEdge(edges[0]) != null){
					edge = vertex.getEdge(edges[0]);
					type = edge.getType();
					//change
					next = org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.getNeighborFromEdge(edge, edges[0]);
					vertical = true;
				}else if (vertex.getEdge(edges[2]) != null){
					edge = vertex.getEdge(edges[2]);
					next = org.eclipse.tracecompass.analysis.graph.core.base.TmfVertex.getNeighborFromEdge(edge, edges[2]);
					eTime = next.getTs();
					
					// add critpath data
					type = edge.getType();
					status = getChar(type);
					time = eTime-sTime;
					t = status + ":" + time;
					writeLine(critPathHandle, t);
				}else{
					next = null;
				}
			}
		}
	}    
}

function getChar(status){
	if(status == "BLOCK_DEVICE"){
		return'A';
	}else if(status == "BLOCKED"){
		return('B');
	}else if(status == "DEFAULT"){
		return'C';
	}else if(status == "EPS"){
		return'D';
	}else if(status == "INTERRUPTED"){
		return'E';
	}else if(status == "IPI"){
		return'F';
	}else if(status =="NETWORK"){
		return'G';
	}else if(status == "PREEMPTED"){
		return'H';
	}else if(status == "RUNNING"){
		return'I';
	}else if(status == "TIMER"){
		return'J';
	}else if(status == "UNKNOWN"){
		return'K';
	}else if(status == "USER_INPUT"){
		return'L';
	}else{
		return'Z';
	}
}
