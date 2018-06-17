/*
 * Unlock TAPP One
 *
 * TODO: camelCase it (I'm no JavaScript programmer...)
 */

require('use-strict');
'use-strict';

const noble  = require('noble');
const assert = require('assert');

const values   = require('./values.js');
const commands = values.commands;
//const responses = values.responses;

const FIRSTPAIRKEY = [ 0xae, 0x95, 0x66, 0xc7 ];
let serial_number  = [ 0, 0, 0, 0 ]; // get via PAIRING_FIRST_TIME
const key1         = [ 0x11, 0x11, 0x11, 0x11 ];
const key2         = [ 0x22, 0x22, 0x22, 0x22 ];

function command_to_data(command, command2, parameters) {
    var data = [];
    data.push(0x55);
    data.push(0xaa);
    data.push(command);
    data.push(command2); // ?
    data.push(parameters.length & 0xff);
    data.push(parameters.length >> 8);
    data.push(...parameters);
    var sum = data.reduce((a, b) => a + b, 0);
    data.push(sum & 0xff);
    data.push(sum >> 8);
    return new Buffer(data);
}

const serviceUUIDs = [ '6e400001b5a3f393e0a9e50e24dcca9e' ];

function startScanning_cb(error) {
    console.log('startScanning_cb', error);
}

noble.on('scanStart', scanStart_cb);

function scanStart_cb() {
    console.log('Started scanning');
}

noble.on('scanStop', scanStop_cb);

function scanStop_cb() {
    console.log('Stopped scanning');
    noble.startScanning(serviceUUIDs, true, startScanning_cb);
    console.log('Started scanning');
}

// here we start scanning. we check if Bluetooth is on
noble.on('stateChange', stateChange_cb);

function stateChange_cb(state) {
    if (state === 'poweredOn') {
        noble.startScanning(serviceUUIDs, true, startScanning_cb);
        console.log('Started scanning');
    } else {
        noble.stopScanning();
        console.log('Is Bluetooth on?');
    }
}

// for every peripheral we discover, run this callback function
noble.on('discover', discover_cb);

let lock_peripheral = null;

let reconnectTimeout = null;

function discover_cb(peripheral) {

    if (reconnectTimeout != null) {
        console.log('discover_cb: reconnectTimeout running, waiting');
        return;
    }

    //uncomment the line below if you want to see all data provided.
    //console.log(peripheral);

    //here we output the some data to the console.
    console.log('\n Discovered new peripheral with UUID ' + peripheral.uuid + ':');
    console.log('\t Peripheral Bluetooth address:' + peripheral.address);

    if (peripheral.advertisement.localName) {
        console.log('\t Peripheral local name:' + peripheral.advertisement.localName);
    }
    if (peripheral.rssi) {
        console.log('\t RSSI: ' + peripheral.rssi); //RSSI is the signal strength
    }
    if (peripheral.state) {
        console.log('\t state: ' + peripheral.state);
    }
    if (peripheral.advertisement.serviceUuids.length) {
        console.log('\t Advertised services:' + JSON.stringify(peripheral.advertisement.serviceUuids));
    }

    var serviceData = peripheral.advertisement.serviceData;
    if (serviceData && serviceData.length) {
        console.log('\t Service Data:');
        for (var i in serviceData) {
            console.log('\t\t' + JSON.stringify(serviceData[i].uuid) + ': ' + JSON.stringify(serviceData[i].data.toString('hex')));
        }
    }
    if (peripheral.advertisement.manufacturerData) {
        console.log('\t Manufacturer data: ' + JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex')));
    }
    if (peripheral.advertisement.txPowerLevel !== undefined) {
        console.log('\t TX power level: ' + peripheral.advertisement.txPowerLevel);
    }

    if (lock_peripheral == null || peripheral == lock_peripheral) {
        // okay
    } else {
        return; // ignore
    }

    console.log('connecting to', peripheral.id);
    peripheral.once('connect', connect_cb);
    peripheral.once('disconnect', disconnect_cb);

    let connectTimeout = setTimeout(function() {
        console.log('connect timeout', peripheral.id);
        disconnect_cb(); // start retry timer
    }, 5000);

    peripheral.connect(); // start connection attempts

    function connect_cb() {

        console.log('connected', peripheral.id);
        clearTimeout(connectTimeout);

        console.log('discovering', peripheral.id);
        const characteristicUUIDs = [ '6e400002b5a3f393e0a9e50e24dcca9e', '6e400003b5a3f393e0a9e50e24dcca9e' ];
        peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, discoverServicesAndCharacteristics_cb);

        // the service/characteristic exploration function:
        function discoverServicesAndCharacteristics_cb(error, services, characteristics) {

            console.log('discovering finished', peripheral.id, error);

            lock_peripheral = peripheral;

            console.log('discoverServicesAndCharacteristics_cb');

            let data_char;
            let write_char;

            let current_command  = undefined;
            const command_queue  = [];
            let response_timeout = "BUSY";

            let fp_data = [];

            function try_next_command() {
                if (peripheral.state != 'connected') {
                    console.log('not connected!');
                    return;
                }
                if (response_timeout != null) {
                    return;
                }
                current_command = command_queue.shift();
                if (current_command !== undefined) {
                    console.log('next command', current_command);
                    response_timeout = setTimeout(response_timeout_cb, 1000); //, current_command);

                    // TODO: use object { } with length:xx

                    const length = current_command.command[2] | current_command.command[3] << 8;
                    const data = command_to_data(current_command.command[0], current_command.command[1], current_command.parameters);

                    write_char.write(data, function(data, error) {
                        // TODO: check error and clear timeout?
                    });
                } else {
                    // console.log('no more commands');
                }
            }

            function queue_command(command, parameters = [], callback = null) {
                command_queue.push({command : command, parameters : parameters, callback : callback});
                try_next_command();
            }

            function queue_fp_data(fp_index, parameters) {
                const data = command_to_data(0xe0, fp_index, parameters);
                console.log('queue_fp_data: writing', data);
                write_char.write(data, function(data, error) {
                    // next?
                    console.log('queue_fp_data: callback', data, error);
                });
            }

            for (c in characteristics) {
                if (characteristics[c].uuid == '6e400003b5a3f393e0a9e50e24dcca9e') {
                    data_char = characteristics[c]
                    //data_char.unsubscribe();
                    data_char.subscribe(subscribe_cb);

                    function subscribe_cb(error) {
                        if (error)
                            throw error;
                        console.log('subscribe_cb');

                        response_timeout = null;
                        try_next_command();
                    }

                    data_char.on('data', data_cb);

                    function response_timeout_cb() {
                        console.log('response_timeout_cb');
                        response_timeout = null;
                        try_next_command();
                    }

                    function data_cb(data, isNotification) {

                        if (data.length < 4 || data[0] != 0xaa || data[1] != 0x55) {
                            console.log('data_cb: invalid ', data);
                            return;
                        }

                        const sum = data.slice(0, data.length - 2).reduce((a, b) => a + b, 0);
                        if (data[data.length - 2] != (sum & 0xff) || data[data.length - 1] != (sum >> 8)) {
                            console.log('data_cb: corrupt ', data);
                            return;
                        }

                        const cmd1       = data[2];
                        const cmd2       = data[3];
                        const length     = data[4] | data[5] << 8;
                        const parameters = data.slice(6, 6 + length);

                        if (current_command !== undefined && current_command.command.length >= 2 && cmd1 == current_command.command[0] && cmd2 == current_command.command[1]) {
                            clearTimeout(response_timeout);

                            if (current_command.callback != null) {
                                console.log('data_cb: callback', parameters);
                                current_command.callback(parameters);
                            } else {
                                console.log('data_cb: no callback', parameters);
                            }

                            response_timeout = null; // busy = false;
                            try_next_command();
                            return;
                        }

                        if (cmd1 == 0xe0) {
                            console.log('data_cb: fingerprint data?', parameters);

                            if (current_command !== undefined && current_command.command.length >= 4 && current_command.command[0] == commands.FETCHFP[0] && current_command.command[1] == commands.FETCHFP[1]) {
                                const fp_index = current_command.parameters[0] | current_command.parameters[1] << 8;
                                fp_data.push(...parameters);

                                // console.log('data_cb: expected data. fp #', fp_index, 'length', fp_data.length);

                                if (parameters.length < 12) {
                                    const sum = [...fp_data.slice(0, fp_data.length - 2) ].reduce((a, b) => a + b, 0);
                                    if (fp_data[fp_data.length - 2] == (sum & 0xff) && fp_data[fp_data.length - 1] == (sum >> 8)) {
                                        console.log('data_cb: fingerprint fp_data read correctly for fp_index', fp_index);
                                    }
                                }

                                clearTimeout(response_timeout);
                                response_timeout = setTimeout(response_timeout_cb, 1000); // , current_command);
                                return;
                            }
                        }

                        if (cmd1 == 0xd0) {
                            console.log('data_cb: history data?', parameters);

                            // const parameters = data.slice(6, 6 + length*2); // strange
                            for (let i = 0; i < length; i++) {
                                const fp_index = data[6 + i * 2 + 0] | data[6 + i * 2 + 1] << 8;
                                console.log('data_cb: history fp_index', fp_index);
                                // newest to oldest!
                            }
                        }

                        console.log('data_cb: ignored ', data);
                    }
                } else if (characteristics[c].uuid == '6e400002b5a3f393e0a9e50e24dcca9e') {
                    write_char = characteristics[c];
                }
            }

            queue_command(commands.PAIRING_REGULAR, [ 0x11, 0x11, 0x11, 0x11, 0xb5, 0x59, 0x08, 0xd0 ], function(parameters) {
                console.log('PAIRING_REGULAR result', parameters);

                console.log('ITS TIME TO OPEN!');
                queue_command(commands.UNLOCK, [], function(parameters) {
                    peripheral.disconnect();
                    // data_char.unsubscribe();
                });

                queue_command(commands.DISCONNECT);



                // or just do whatever you want here...

                //queue_command(commands.LOCK_STATUS);

                //queue_command(commands.HISTORY);
                // <Buffer aa 55 d0 00 00 00 cf 01>
                // <Buffer aa 55 d0 00 02 00 01 00 01 00 d3 01>
                // <Buffer aa 55 d0 00 06 00 01 00 01 00 01 00 01 00 01 00 01 00 db 01>
                // 16 bits...  upper bit is session? (for HISTORY_ALL)

                // read fingerprint...
                // fp_data = [];
                // queue_command(commands.FETCHFP, [ 1, 0 ], null); //, function(data) {
                //     console.log('data', data);
                // });

                // queue_command(commands.MORSE, [ 1, 12 << 4 ]); // short * 11, long

                // queue_command(commands.MORSE, [ 32, 6 << 4 ]); // long, short, short, short, short, short
                //                                                // min 6. max 12 bits

                // if (this.position < 12) {
                //                   this.addShortView();
                //                   this.morseBuilder.append("0");
                //                   if (this.position > 7) {
                //                       this.morseCode[1] = (byte)(this.morseCode[1] << 1 | (0x80 & this.morseCode[0]) >> 7);
                //                   }
                //                   this.morseCode[0] <<= 1;
                //                   return;
                //               }

                // if (this.position < 12) {
                //                   this.addLongView();
                //                   this.morseBuilder.append("1");
                //                   if (this.position > 7) {
                //                       this.morseCode[1] = (byte)(this.morseCode[1] << 1 | (0x80 & this.morseCode[0]) >> 7);
                //                   }
                //                   this.morseCode[0] = (byte)(0x1 | this.morseCode[0] << 1);
                //                   return;
                //               }

                //         this.morseCode[1] |= (byte)(this.position << 4);

                // clang-format off
                //queue_command(commands.STOREFP, [ 0xf2, 0x01 ]);

                // for (let i=0; i<256; i++ ){
                //     queue_command([ i, 4, 0, 0], []);
                // }

               //queue_command(commands.STORE_FP_PACKAGE, [ 0x00, 0x00 ]);

                //queue_command(commands.STORE_FP_PACKAGE, [ 0x04, 0x16, 0x6d, 0x0f, 0xa5, 0x6a, 0xf6, 0xc0, 0x83, 0xdb, 0x45, 0x00, ]);

                // let i = 0;
                // queue_fp_data(i, [ 0x04, 0x16, 0x6d, 0x0f, 0xa5, 0x6a, 0xf6, 0xc0, 0x83, 0xdb, 0x45, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x1d, 0x23, 0xf8, 0xc7, 0xc3, 0xb9, 0x85, 0xe8, 0x2d, 0x84, 0xf8, 0xbb, ]);i += 1;
                // queue_fp_data(i, [ 0x07, 0x8a, 0x49, 0xee, 0x4e, 0x1c, 0xf9, 0x36, 0x8a, 0x7b, 0xb2, 0x58, ]);i += 1;
                // queue_fp_data(i, [ 0x69, 0xa4, 0xf7, 0x39, 0x86, 0x39, 0x74, 0xe0, 0xbe, 0x94, 0xf5, 0x3d, ]);i += 1;
                // queue_fp_data(i, [ 0x44, 0x0c, 0x76, 0xe0, 0x76, 0xcb, 0xf9, 0xde, 0x06, 0x6c, 0x0b, 0xd0, ]);i += 1;
                // queue_fp_data(i, [ 0xa5, 0x3b, 0xf4, 0x41, 0x43, 0x1e, 0xc2, 0x07, 0xe6, 0x92, 0xf9, 0xdd, ]);i += 1;
                // queue_fp_data(i, [ 0x05, 0x9b, 0x07, 0xd7, 0x29, 0xf4, 0x69, 0xcf, 0x99, 0x2c, 0xff, 0xe7, ]);i += 1;
                // queue_fp_data(i, [ 0x0a, 0xa5, 0xf7, 0x29, 0x47, 0x58, 0xb8, 0x08, 0x35, 0x2d, 0xf8, 0xa1, ]);i += 1;
                // queue_fp_data(i, [ 0x45, 0xa9, 0x0b, 0x0f, 0x69, 0x55, 0x79, 0x19, 0x44, 0x4b, 0xfa, 0x17, ]);i += 1;
                // queue_fp_data(i, [ 0xa6, 0xc5, 0xa7, 0x27, 0x03, 0x3a, 0xfe, 0xe7, 0xf9, 0xb1, 0x78, 0xd1, ]);i += 1;
                // queue_fp_data(i, [ 0x02, 0xbb, 0x3f, 0xf8, 0x49, 0x9a, 0xf9, 0xd7, 0x45, 0xaa, 0x7f, 0xe8, ]);i += 1;
                // queue_fp_data(i, [ 0xd1, 0x6a, 0x4a, 0x65, 0x06, 0xfc, 0xf3, 0xfe, 0x06, 0xb3, 0x7a, 0xea, ]);i += 1;
                // queue_fp_data(i, [ 0x8e, 0x6a, 0x3f, 0xf8, 0xe2, 0x5b, 0x4b, 0x75, 0x46, 0xfe, 0x6b, 0xe8, ]);i += 1;
                // queue_fp_data(i, [ 0x65, 0x7c, 0x4b, 0x74, 0x45, 0xfe, 0x93, 0xe8, 0x1e, 0xd4, 0x4b, 0x7c, ]);i += 1;
                // queue_fp_data(i, [ 0x83, 0xfc, 0xef, 0xef, 0x85, 0xd5, 0x4a, 0x0c, 0xc5, 0x5a, 0xfe, 0xe7, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xb5, 0x77, 0x26, 0x63, ]);i += 1;
                // queue_fp_data(i, [ 0x34, 0x52, 0x42, 0x45, 0x65, 0x32, 0x3f, 0x61, 0x2c, 0x51, 0x37, 0x64, ]);i += 1;
                // queue_fp_data(i, [ 0x23, 0xf2, 0x42, 0xff, 0xff, 0x2f, 0x51, 0x33, 0x35, 0xf4, 0x63, 0x74, ]);i += 1;
                // queue_fp_data(i, [ 0x58, 0x2f, 0x25, 0xff, 0x3f, 0xff, 0xff, 0x09, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, ]);i += 1;
                // queue_fp_data(i, [ 0x00, 0x00, 0x00, 0x00, 0xff, 0x6d, ]);
                // clang-format on

            });

            //characteristics[1].subscribe(subscribe_cb);
            //characteristics[1].notify(true, subscribe_cb);

            // TODO: find when it's ready for commands? or retry when comm error

            // get serial number
            // queue_command(commands.PAIRING_FIRST_TIME, FIRSTPAIRKEY), 250); // <Buffer aa 55 81 01 07 00 00 b5 59 08 d0 00 02 70 03>

            // queue_command(commands.PAIRING_REGULAR, [ 0x11, 0x11, 0x11, 0x11 ].concat(serial_number)), 400); // good key1 + retrieved serial

            // queue_command(commands.PAIRING_REGULAR, [ 0x11, 0x11, 0x11, 0x11, 0xb5, 0x59, 0x08, 0xd0 ]), 0); // good key/serial
            // setTimeout(() => send_command(commands.PAIRING_REGULAR, FIRSTPAIRKEY.concat(FIRSTPAIRKEY)), 400); // bad key/serial
            // setTimeout(() => send_command(commands.PAIRING_REGULAR, key1.concat(serial_number)), 400); // guessed key1 + retrieved serial

            // queue_command(commands.GET_DEVICE_VERSION);  // <Buffer 00>

            // queue_command(commands.GET_DEVICE_MAC);
            // data_cb: response type GET_DEVICE_MAC parameters <Buffer 01 de 44 b3 69 30 c2>
            // data_cb: response type GET_DEVICE_MAC parameters <Buffer 00>

            // queue_command(commands.START_DFU), 500); // needs to be paired first!

            // queue_command(commands.HISTORY), 500); // <Buffer 01 04 00>

            // queue_command(commands.FETCHFP, [ 1, 0 ]);

            // data_cb: response type PAIRING_FIRST_TIME parameters <Buffer 00 b5 59 08 d0 00 02>

            // queue_command(commands.BOOTING, key1.concat(key2).concat(serial_number));

            // queue_command(commands.ENROLL);

            // queue_command(commands.EXIT_TESTMODE); //    <Buffer 01>
            // queue_command(commands.ENTER_TESTMODE); //    <Buffer 01>

            // queue_command(commands.ENROLL);   //  <Buffer 00 04>
            // queue_command(commands.BATTERY);  // <01 28>

            // queue_command(commands.HISTORY_ALL); //   <Buffer 01 01 00>
            // queue_command(commands.DISCONNECT);

            // queue_command(commands.ENTER_TESTMODE_VERIFICATION);
            // queue_command(commands.FACTORY_RESET);
            // queue_command(commands.LED_TEST);
            // queue_command(commands.MOTOR_TEST);

            // setTimeout(() => send_command(commands.UNLOCK);

            function write_cb(data, error) {
                if (error)
                    throw error;
                console.log('write_cb');
            }
        }
    }

    function disconnect_cb() {
        clearTimeout(connectTimeout);
        connectTimeout = null;

        console.log('peripheral disconnected. lock:', peripheral == lock_peripheral);

        if (peripheral == lock_peripheral) {
            console.log('starting delay for reconnection', peripheral.id);
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(function() {
                reconnectTimeout = null;
                console.log('allowing connect again to', peripheral.id);
            }, 12000); // try again. (lock has 10sec off delay!)
        }
    }
};
