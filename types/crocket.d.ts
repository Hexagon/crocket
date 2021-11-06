export = Crocket;
/**
 * @constructor
 * @param {*} [mediator]
 * @returns {Crocket}
 */
declare function Crocket(mediator?: any): Crocket;
declare class Crocket {
    /**
     * @constructor
     * @param {*} [mediator]
     * @returns {Crocket}
     */
    constructor(mediator?: any);
    mediator: any;
    sockets: any[];
    opts: {};
    private _onMessage;
    private _onData;
    buffer: any;
    /**
     * @public
     * @param {string} event
     * @param {Function} callback
     * @returns {Crocket}
     */
    public on(event: string, callback: Function): Crocket;
    /**
     * @public
     * @param {string} topic
     * @param {*} data
     * @param {Function} [callback]
     * @returns {Crocket}
     */
    public emit(topic: string, data: any, callback?: Function): Crocket;
    /**
     * @public
     * @param {Function} [callback]
     * @returns {Crocket}
     */
    public close(callback?: Function): Crocket;
    /**
     * @public
     * @param {CrocketOptions} options
     * @param {Function} callback
     * @returns {Crocket}
     */
    public listen(options: CrocketOptions, callback: Function): Crocket;
    isServer: boolean;
    server: any;
    /**
     * @public
     * @param {CrocketOptions} options
     * @param {Function} callback
     * @returns {Crocket}
     */
    public connect(options: CrocketOptions, callback: Function): Crocket;
}
declare namespace Crocket {
    export { CrocketOptions };
}
/**
 * - Crocket Options
 */
type CrocketOptions = {
    /**
     * - Path to socket, defaults to /tmp/crocket-ipc.sock
     */
    path?: string;
    /**
     * - Hostname/ip to connect to/listen to
     */
    host?: string;
    /**
     * - Port to connect/listen to, if port is specified, socket path is ignored and tcp is used instead
     */
    port?: number;
    /**
     * - In ms, defaults to 2000 for server and 5000 for client
     */
    timeout?: number;
    /**
     * - How many ms between reconnection attempts, defaults to -1 (disabled)
     */
    reconnect?: number;
    /**
     * - Encoding for transmission, defaults to utf8
     */
    encoding?: string;
};
