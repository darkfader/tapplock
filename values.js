// clang-format off

exports.result = {
    ERROR : 0,
    OK : 1,
};

exports.commands = {   // cmd, cmd2, length, default data
    PAIRING_FIRST_TIME          : [ 0x81, 1, 4, 0 ],
    BOOTING                     : [ 0x92, 1, 12, 0 ],   // key1, key2, serial. call after adding lock?
    FACTORY_RESET               : [ 0xe3, 1, 0, 0 ],
    PAIRING_REGULAR             : [ 0xb4, 1, 8, 0 ], // give key1, serial. 4 attempts
    GET_DEVICE_VERSION          : [ 0x45, 1, 0, 0 ],  // get version. OK 00 01 00 01  = 1.1?
    CONFIGURE_PARAMETERS        : [ 0x56, 1, 4, 0 ],

    SET_DEVICE_NAME1            : [ 0x89, 1 ],      // set first part of name. max 12 characters
    SET_DEVICE_NAME2            : [ 0x8a, 1 ],      // set second part of name.
    START_DFU                   : [ 0x27, 1, 0, 0 ],
    GET_DEVICE_MAC              : [ 0x9a, 1, 0, 0 ], // get device MAC address
    DISCONNECT                  : [ 0x78, 1, 0, 0 ], // disconnects bluetooth

    // next command { command: [ 17, 2, 0, 0 ], parameters: [], callback: null }
    // data_cb: no callback <Buffer 01 80 00 00 00>

    UNLOCK                      : [ 0x81, 2, 0, 0 ], // open the lock (after PAIRING_REGULAR)
    ENROLL                      : [ 0x92, 2, 0, 0 ], // enroll fingerprint. results OK 01 00  for first enrollment etc.
    SEARCH                      : [ 0xe3, 2, 0, 0 ],
    NEXTINDEX                   : [ 0xb4, 2, 0, 0 ],
    DELETE                      : [ 0x45, 2, 2, 0 ], // delete fingerprint
    DELETE_ALL                  : [ 0x56, 2, 0, 0 ], // delete all fingerprints

    CHECK_MEMORY                : [ 0x27, 2, 0, 0 ],
    HISTORY                     : [ 0x9a, 2, 0, 0 ],    // returns number of opens. then 0xD0 <Buffer 01 80 02>
    HISTORY_ALL                 : [ 0x9b, 2, 0, 0 ],
    FETCHFP                     : [ 0x78, 2, 2, 0 ],    // give fp index, returns a lot of 0xe0, 0x00-0x29, 12,0, [12-byte data block]
    STOREFP                     : [ 0x89, 2, 2, 0, 0xf2, 0x01 ], // store fingerprint?
    STORE_FP_PACKAGE            : [ 0xe0 ],
    MORSE                       : [ 0xeb, 2, 2, 0 ],

    BATTERY                     : [ 0x81, 3, 0, 0 ],    // returns ERROR when not paired, otherwise OK PERCENTAGE
    //LOCK_STATUS                 : [ 0x92, 3, 0, 0 ],
    //ROTATE_SWITCH_STATE         : [ 0xe3, 3, 0, 0 ],
    //SHACK_SWITCH_STATE          : [ 0xb4, 3, 0, 0 ],

    ENTER_TESTMODE              : [ 0x81, 8, 0, 0 ],
    //ENTER_TESTMODE_VERIFICATION : [ 0x81, 208, 10, 0, 0x27,0xB7,0x89,0xC2,0x3F,0xCD,0xC6,0x8F,0x13,0x73 ],
    EXIT_TESTMODE               : [ 0x92, 8, 0, 0 ],
    LED_TEST                    : [ 0xe3, 8, 0, 0 ],    // cycle color: red, green, blue, white
    MOTOR_TEST                  : [ 0x45, 8, 0, 0 ],    // opens lock in test mode
    FPSENSOR_TEST               : [ 0x2F, 8, 0, 0 ],
    RIM_SWITCH_TEST             : [ 0x56, 8, 0, 0 ],    // returns OK when pressed
    BLE_STRENGTH_SET            : [ 0x27, 8, 1, 0 ],
    BATTERY_TEST                : [ 0x78, 8, 0, 0 ],
    FLASH_TEST                  : [ 0x89, 8, 0, 0 ],
    BLE_TEST                    : [ 0x9a, 8, 0, 0 ],    // returns 1 and part of UUID
    //ALARM_TEST                  : [ 0xeb, 8, 0, 0 ],
    DELETE_FP_TEST              : [ 0xbc, 8, 2, 0 ],
    DELETE_ALL_FP_TEST          : [ 0x4d, 8, 0, 0 ],
    ENROLL_FP_TEST              : [ 0xb4, 8, 0, 0 ],
};

exports.responses = {
    UNLOCK                        : [ 0x81, 2 ],
    NEXTINDEX                     : [ 0xb4, 2 ],
    ENROLL                        : [ 0x92, 2 ],
    DELETE                        : [ 0x45, 2 ],
    DELETE_ALL                    : [ 0x56, 2 ],
    MORSE                         : [ 0xeb, 2 ],
    PAIRING_FIRST_TIME            : [ 0x81, 1 ],
    BOOTING                       : [ 0x92, 1 ],
    FACTORY_RESET                 : [ 0xe3, 1 ],
    PAIRING_REGULAR               : [ 0xb4, 1 ],
    GET_DEVICE_VERSION            : [ 0x45, 1 ],
    CONFIGURE_PARAMETERS          : [ 0x56, 1 ],
    SET_DEVICE_NAME               : [ 0x89, 1 ],
    START_DFU                     : [ 0x27, 1 ],
    GET_DEVICE_MAC                : [ 0x9a, 1 ],
    DISCONNECT                    : [ 0x78, 1 ],
    SEARCH                        : [ 0xe3, 2 ],
    CHECK_MEMORY                  : [ 0x27, 2 ],
    FETCHFP                       : [ 0x78, 2 ],
    STOREFP                       : [ 0x89, 2 ],
    HISTORY                       : [ 0x9a, 2 ],
    HISTORY_ALL                   : [ 0x9b, 2 ],
    BATTERY                       : [ 0x81, 3 ],
    LOCK_STATUS                   : [ 0x92, 3 ],
    ROTATE_SWITCH_STATE           : [ 0xe3, 3 ],
    SHACKLE_SWITCH_STATE          : [ 0xb4, 3 ],
    ENTER_TESTMODE                : [ 0x81, 8 ],
    EXIT_TESTMODE                 : [ 0x92, 8 ],
    LED_TEST                      : [ 0xe3, 8 ],
    FPSENSOR_TEST                 : [ 0x2f, 8 ],
    MOTOR_TEST                    : [ 0x45, 8 ],
    RIM_SWITCH_TEST               : [ 0x56, 8 ],
    BLE_STRENGTH_SET              : [ 0x27, 8 ],
    BATTERTY_TEST                 : [ 0x78, 8 ],
    FLASH_TEST                    : [ 0x89, 8 ],
    BLE_TEST                      : [ 0x9a, 8 ],
    ALARM_TEST                    : [ 0xeb, 8 ],
    DELETE_FP_TEST                : [ 0xbc, 8 ],
    DELETE_ALL_FP_TEST            : [ 0x4d, 8 ],
    ENROLL_FP_TEST                : [ 0xb4, 8 ],

    HISTORY_DATA                  : [ 0xd0 ],   // length * 2
    FETCH_FP_PACKAGE              : [ 0xe0 ],
};

// clang-format on
