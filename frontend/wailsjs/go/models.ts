export namespace main {
	
	export class SSHHost {
	    id: string;
	    name: string;
	    host: string;
	    port: number;
	    user: string;
	    password: string;
	    identityFile: string;
	    tags: string[];
	    color: string;
	    // Go type: time
	    lastUsed: any;
	    useCount: number;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new SSHHost(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.host = source["host"];
	        this.port = source["port"];
	        this.user = source["user"];
	        this.password = source["password"];
	        this.identityFile = source["identityFile"];
	        this.tags = source["tags"];
	        this.color = source["color"];
	        this.lastUsed = this.convertValues(source["lastUsed"], null);
	        this.useCount = source["useCount"];
	        this.description = source["description"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

