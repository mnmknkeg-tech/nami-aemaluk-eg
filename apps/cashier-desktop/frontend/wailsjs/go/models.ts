export namespace main {
	
	export class AppState {
	    configured: boolean;
	    shopName: string;
	    serverUrl: string;
	    email: string;
	    hasProducts: boolean;
	    currentSet: boolean;
	    sessionExpired: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.configured = source["configured"];
	        this.shopName = source["shopName"];
	        this.serverUrl = source["serverUrl"];
	        this.email = source["email"];
	        this.hasProducts = source["hasProducts"];
	        this.currentSet = source["currentSet"];
	        this.sessionExpired = source["sessionExpired"];
	    }
	}
	export class CheckoutItem {
	    productId: string;
	    name: string;
	    quantity: number;
	    price: number;
	
	    static createFrom(source: any = {}) {
	        return new CheckoutItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.productId = source["productId"];
	        this.name = source["name"];
	        this.quantity = source["quantity"];
	        this.price = source["price"];
	    }
	}
	export class CheckoutRequest {
	    items: CheckoutItem[];
	    paymentMethod: string;
	    discountType: string;
	    discountValue: number;
	    customerName: string;
	    customerPhone: string;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new CheckoutRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], CheckoutItem);
	        this.paymentMethod = source["paymentMethod"];
	        this.discountType = source["discountType"];
	        this.discountValue = source["discountValue"];
	        this.customerName = source["customerName"];
	        this.customerPhone = source["customerPhone"];
	        this.notes = source["notes"];
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
	export class CheckoutResult {
	    order: store.Order;
	    items: store.OrderItem[];
	    change: number;
	
	    static createFrom(source: any = {}) {
	        return new CheckoutResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.order = this.convertValues(source["order"], store.Order);
	        this.items = this.convertValues(source["items"], store.OrderItem);
	        this.change = source["change"];
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
	export class GateCashier {
	    id: string;
	    name: string;
	    permissions: string[];
	
	    static createFrom(source: any = {}) {
	        return new GateCashier(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.permissions = source["permissions"];
	    }
	}
	export class currentCashier {
	    id: string;
	    name: string;
	    isAdmin: boolean;
	    permissions: string[];
	
	    static createFrom(source: any = {}) {
	        return new currentCashier(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.isAdmin = source["isAdmin"];
	        this.permissions = source["permissions"];
	    }
	}
	export class GateInfo {
	    mode: string;
	    activeShift?: store.Shift;
	    cashiers: GateCashier[];
	    hasAdminPin: boolean;
	    current?: currentCashier;
	    shopName: string;
	    lastSync?: string;
	
	    static createFrom(source: any = {}) {
	        return new GateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mode = source["mode"];
	        this.activeShift = this.convertValues(source["activeShift"], store.Shift);
	        this.cashiers = this.convertValues(source["cashiers"], GateCashier);
	        this.hasAdminPin = source["hasAdminPin"];
	        this.current = this.convertValues(source["current"], currentCashier);
	        this.shopName = source["shopName"];
	        this.lastSync = source["lastSync"];
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

export namespace store {
	
	export class CashMovement {
	    id: string;
	    shiftId: string;
	    kind: string;
	    amount: number;
	    note?: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new CashMovement(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.shiftId = source["shiftId"];
	        this.kind = source["kind"];
	        this.amount = source["amount"];
	        this.note = source["note"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class HeldOrder {
	    id: string;
	    label: string;
	    payload: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new HeldOrder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.payload = source["payload"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class Order {
	    id: string;
	    remoteId?: string;
	    shiftId: string;
	    total: number;
	    subtotal: number;
	    discount: number;
	    paymentMethod: string;
	    status: string;
	    customerName?: string;
	    customerPhone?: string;
	    notes?: string;
	    cashierId?: string;
	    cashierName?: string;
	    createdAt: string;
	    synced: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Order(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.remoteId = source["remoteId"];
	        this.shiftId = source["shiftId"];
	        this.total = source["total"];
	        this.subtotal = source["subtotal"];
	        this.discount = source["discount"];
	        this.paymentMethod = source["paymentMethod"];
	        this.status = source["status"];
	        this.customerName = source["customerName"];
	        this.customerPhone = source["customerPhone"];
	        this.notes = source["notes"];
	        this.cashierId = source["cashierId"];
	        this.cashierName = source["cashierName"];
	        this.createdAt = source["createdAt"];
	        this.synced = source["synced"];
	    }
	}
	export class OrderItem {
	    id: string;
	    orderId: string;
	    productId: string;
	    name: string;
	    quantity: number;
	    price: number;
	
	    static createFrom(source: any = {}) {
	        return new OrderItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.orderId = source["orderId"];
	        this.productId = source["productId"];
	        this.name = source["name"];
	        this.quantity = source["quantity"];
	        this.price = source["price"];
	    }
	}
	export class Product {
	    id: string;
	    name: string;
	    price: number;
	    stock: number;
	    category: string;
	    imageUrl?: string;
	    isActive: boolean;
	    trackStock: boolean;
	    barcode?: string;
	    updatedAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new Product(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.price = source["price"];
	        this.stock = source["stock"];
	        this.category = source["category"];
	        this.imageUrl = source["imageUrl"];
	        this.isActive = source["isActive"];
	        this.trackStock = source["trackStock"];
	        this.barcode = source["barcode"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class Shift {
	    id: string;
	    remoteId?: string;
	    openedById?: string;
	    openedByName?: string;
	    openingAmount: number;
	    closingAmount?: number;
	    expectedAmount?: number;
	    difference?: number;
	    totalSales: number;
	    ordersCount: number;
	    status: string;
	    note?: string;
	    openedAt: string;
	    closedAt?: string;
	    synced: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Shift(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.remoteId = source["remoteId"];
	        this.openedById = source["openedById"];
	        this.openedByName = source["openedByName"];
	        this.openingAmount = source["openingAmount"];
	        this.closingAmount = source["closingAmount"];
	        this.expectedAmount = source["expectedAmount"];
	        this.difference = source["difference"];
	        this.totalSales = source["totalSales"];
	        this.ordersCount = source["ordersCount"];
	        this.status = source["status"];
	        this.note = source["note"];
	        this.openedAt = source["openedAt"];
	        this.closedAt = source["closedAt"];
	        this.synced = source["synced"];
	    }
	}

}

export namespace syncer {
	
	export class Status {
	    online: boolean;
	    syncing: boolean;
	    lastSync?: string;
	    pending: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.online = source["online"];
	        this.syncing = source["syncing"];
	        this.lastSync = source["lastSync"];
	        this.pending = source["pending"];
	        this.error = source["error"];
	    }
	}

}

