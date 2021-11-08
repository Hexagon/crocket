export = Crocket;
/**
 * Crocket constructor
 *
 * @constructor
 * @param {*} [mediator] - Mediator to use, EventEmitter is default
 * @returns {Crocket}
 */
declare function Crocket(mediator?: any): Crocket;
declare class Crocket {
    /**
     * Crocket constructor
     *
     * @constructor
     * @param {*} [mediator] - Mediator to use, EventEmitter is default
     * @returns {Crocket}
     */
    constructor(mediator?: any);
    /** @type {*} */
    mediator: any;
    sockets: any[];
    /** @type {CrocketClientOptions|CrocketServerOptions} */
    opts: CrocketClientOptions | CrocketServerOptions;
    private _onMessage;
    private _onData;
    buffer: any;
    /**
     * Register a callback for a mediator event
     *
     * @public
     * @param {string} event
     * @param {Function} callback
     * @returns {Crocket}
     */
    public on(event: string, callback: Function): Crocket;
    /**
     * Emit a mediator message
     *
     * @public
     * @param {string} topic
     * @param {*} data
     * @param {Function} [callback]
     * @returns {Crocket}
     */
    public emit(topic: string, data: any, callback?: Function): Crocket;
    /**
     * Close IPC connection, used for both server and client
     *
     * @public
     * @param {Function} [callback]
     * @returns {Crocket}
     */
    public close(callback?: Function): Crocket;
    /**
     * Start listening
     *
     * @public
     * @param {CrocketServerOptions} options
     * @param {Function} callback
     * @returns {Crocket}
     */
    public listen(options: CrocketServerOptions, callback: Function): Crocket;
    isServer: boolean;
    server: any;
    /**
     * Connect to a Crocket server
     *
     * @public
     * @param {CrocketClientOptions} options
     * @param {Function} callback
     * @returns {Crocket}
     */
    public connect(options: CrocketClientOptions, callback: Function): Crocket;
}
declare namespace Crocket {
    export { CrocketServerOptions, CrocketClientOptions };
}
/**
 * - Crocket Options
 */
type CrocketClientOptions = {
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
/**
 * - Crocket Options
 */
type CrocketServerOptions = {
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
     * - Encoding for transmission, defaults to utf8
     */
    encoding?: string;
};
