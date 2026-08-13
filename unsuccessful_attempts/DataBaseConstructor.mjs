var log=console?.log;
/** @typedef {number} int */
/**
 * @typedef {Object} objectSettingsForCreationDataBase
 * Настройки для создания БД
 * @property {int} allocatedRecords Начальный предел записей
 * @property {callbackAllocation} [callbackAllocation]
 * @property {boolean} [littleEndian] Порядок записи байт
*/
/**
 * @typedef {Object} objectSettingsForCreationDataBaseFromJSONorFile
 * @property {callbackAllocation} callbackAllocation
*/
class DB {
	/**
	 * Начать создание БД
	 * @param {int} awaitRecords 
	 * @param {objectSettingsForCreationDataBase} objectSettings
	 */
	static create(awaitRecords, objectSettings){
		return new databaseCreation(awaitRecords, objectSettings);
	}
	/**
	 * Создать БД из json описания БД (получите его через getInfo() метод после создания БД) и ArrayBuffer
	 * @param {JSON} databaseInfoJSON 
	 * @param {ArrayBuffer} databuffer 
	 * @param {objectSettingsForCreationDataBaseFromJSONorFile} objectSettings
	 */
	static createFromJSON(databaseInfoJSON, databuffer, objectSettings){
		var databaseInfo=JSON.parse(databaseInfoJSON);
		return new databaseFilling({
			fields:databaseInfo.fields,
			awaitRecords:databaseInfo.maxRecords,
			byteSizeOfRecord:databaseInfo.byteSizeOfRecord,
			allocatedRecords:databaseInfo.allocatedRecords,
			dataBuffer:new Uint8Array(databuffer).buffer,
			littleEndian:databaseInfoJSON.littleEndian,
			countRecords:databaseInfo.recordsCount,
			callbackAllocation:objectSettings.callbackAllocation
		});
	}
}
/** @typedef {"UTF-8" | "UTF-16"} StringTypes */
/** @typedef {"Int8" | "Int16" | "Int32" | "Uint8" | "Uint16" | "Uint32" | "BigInt64" | "BigUint64" | "Float16" | "Float32" | "Float64"} NumberTypes */
/**
 * @callback callbackAllocation
 * @description Функция, вызываемая при "забиве" памяти
 * @param {number} currentRecords - Текущее количество записей
 * @param {number} maxRecords - Предел записей в БД
 */
/**
 * @typedef {Object} objectOfTypeForHeader
 * @property {string} name
 * @property {"Int8" | "Int16" | "Int32" | "Uint8" | "Uint16" | "Uint32" | "BigInt64" | "BigUint64" | "Float16" | "Float32" | "Float64" | "UTF-8" | "UTF-16"} type
 * @property {number | string | boolean} [defaultValue]
 * @property {int} [maxBytes]
 */
class databaseCreation{
	/** @type {Field[]} */
	#fields=[];
	#awaitRecords=0;
	#allocatedRecords=1;
	#byteSizeOfRecord=0;
	#callbackAllocation=null;
	#startByteOffsetForRecords=0;
	#littleEndian=false;
	/**
	 * 
	 * @param {int} awaitRecords 
	 * @param {objectSettingsForCreationDataBase} objectSettings 
	 */
	constructor(awaitRecords, objectSettings){
		this.#awaitRecords=awaitRecords;
		this.#allocatedRecords=objectSettings.allocatedRecords;
		this.#littleEndian=(!!objectSettings.littleEndian);
		if(objectSettings.callbackAllocation) this.#callbackAllocation=(objectSettings.callbackAllocation);
	}
	/**
	 * Не используется на момент апреля 2026 года
	 * @param  {...objectOfTypeForHeader} objectsOfTypes
	 */
	setHeader(...objectsOfTypes){
		//this.#startByteOffsetForRecords=bytesForHeader;
	}
	/**
	 * Добавить поле уникальных значений чисел.  
	 * Помни, что уникальные поля обязательно заполнять данными во избежание дубликатов
	 * @param {string} name 
	 * @param {NumberTypes} type
	 */
	addFieldUniqueNumberValues(name, type){
		if(this.#fields.length>=255) throw Error("Кол-во полей не может быть больше 255");
		var byteSize=getByteSizeFromType(type);
		if(this.#fields.find(elem=>elem.name===name)) throw Error("Таблица не может содержать одинаковые поля");
		this.#fields.push({name, type, offset:this.#byteSizeOfRecord, byteSize, isFieldOfUniqueValues: true});
		this.#byteSizeOfRecord+=byteSize;
		return this;
	}
	/**
	 * Добавить поле значений чисел.  
	 * @param {string} name 
	 * @param {NumberTypes} type
	 */
	addFieldAnyNumberValues(name, type, defaultValue){
		if(this.#fields.length>=255) throw Error("Кол-во полей не может быть больше 255");
		var byteSize=getByteSizeFromType(type);
		if(this.#fields.find(elem=>elem.name===name)) throw Error("Таблица не может содержать одинаковые поля");
		if(defaultValue===undefined){
			defaultValue=0;
			switch(type){
				case "BigUint64":
				case "BigInt64":
					defaultValue=0n;
					break;
			}
		}
		this.#fields.push({name, type, defaultValue, offset:this.#byteSizeOfRecord, byteSize, isFieldOfUniqueValues:false});
		this.#byteSizeOfRecord+=byteSize;
		return this;
	}
	/**
	 * Добавить поле уникальных значений строк.  
	 * Помни, что уникальные поля обязательно заполнять данными во избежание дубликатов  
	 * Пожалуйста помни, что UTF-8 может кодироваться хоть 4 байтами на один символ, грамотно выбирай maxBytes  
	 * **Ограничение:** макс.размер строки в байтах - 2 мегабайта
	 * @param {string} name 
	 * @param {StringTypes} type 
	 * @param {int} maxBytes
	 */
	addFieldUniqueStringValues(name, type, maxBytes){
		if(this.#fields.length>=255) throw Error("Кол-во полей не может быть больше 255");
		if(maxBytes%getByteSizeFromType(type)!==0) throw Error("Некорректное кол-во байт для строки");
		if(maxBytes>=16_777_215) throw RangeError("Строка не может быть больше 2 мегабайт");
		if(this.#fields.find(elem=>elem.name===name)) throw Error("Таблица не может содержать одинаковые поля");
		this.#fields.push({name, type, offset:this.#byteSizeOfRecord, byteSize: maxBytes, isFieldOfUniqueValues: true});
		this.#byteSizeOfRecord+=maxBytes;
		return this;
	}
	/**
	 * Добавить поле значений строк.  
	 * Пожалуйста помни, что UTF-8 может кодироваться хоть 4 байтами на один символ, грамотно выбирай maxBytes  
	 * **Ограничение:** макс.размер строки в байтах - 2 мегабайта
	 * @param {string} name 
	 * @param {StringTypes} type 
	 * @param {int} maxBytes
	 */
	addFieldAnyStringValues(name, type, maxBytes, defaultValue=""){
		if(this.#fields.length>=255) throw Error("Кол-во полей не может быть больше 255");
		if(maxBytes%getByteSizeFromType(type)!==0) throw Error("Некорректное кол-во байт для строки");
		if(maxBytes>=16_777_215) throw RangeError("Строка не может быть больше 2 мегабайт");
		if(this.#fields.find(elem=>elem.name===name)) throw Error("Таблица не может содержать одинаковые поля")
		this.#fields.push({name, type, defaultValue, offset:this.#byteSizeOfRecord, byteSize: maxBytes, isFieldOfUniqueValues:false});
		this.#byteSizeOfRecord+=maxBytes;
		return this;
	}
	/**
	 * Добавить поле значений boolean
	 * @param {string} name 
	 * @param {*} defaultValue 
	 */
	addFieldBooleanValues(name, defaultValue=false){
		if(this.#fields.length>=255) throw Error("Кол-во полей не может быть больше 255");
		if(this.#fields.find(elem=>elem.name===name)) throw Error("Таблица не может содержать одинаковые поля")
		this.#fields.push({name, type:"Bool", defaultValue, offset:this.#byteSizeOfRecord, byteSize:1, isFieldOfUniqueValues:false});
		this.#byteSizeOfRecord+=1;
		return this;
	}
	/**
	 * Установить функцию-колбек для вызова при заполнении выделенной памяти   
	 * - **currentRecords**: (number) Текущее количество записей в буфере.  
	 * - **maxRecords**: (number) Предел записей в БД до расширения.  
	 * @param {callbackAllocation} func 
	 */
	setCallBackForAllocateMemory(func){
		if(typeof func !== "function") throw Error("Принимает только функции");
		this.#callbackAllocation=func;
		return this;
	}
	/**
	 * Конец описания полей таблицы  
	 * **Обязательное требование:** установка колбека для аллокации памяти  
	 * Перейти к работе с записями
	 */
	endCreation(){
		if(this.#callbackAllocation===null) throw Error("Не установлен колбек аллокации памяти");
		if(this.#fields.length>255) throw Error("Кол-во полей не может быть больше 255");
		if(this.#fields.length===0) throw Error("Кол-во полей не может быть равно 0");
		return new databaseFilling({
			fields:this.#fields,
			awaitRecords:this.#awaitRecords,
			byteSizeOfRecord:this.#byteSizeOfRecord,
			allocatedRecords:this.#allocatedRecords,
			callbackAllocation:this.#callbackAllocation,
			bytesForHeader:this.#startByteOffsetForRecords
		});
	}
}
/**
 * @typedef {Object} Field
 * @property {string} name - Название поля
 * @property {string} type - Тип данных (Int32, UTF-8 и т.д.)
 * @property {number} offset - Смещение в байтах внутри записи
 * @property {number} byteSize - Размер поля в байтах
 * @property {boolean} isFieldOfUniqueValues - Это поле уникальных значений
 * @property {number | string | boolean} [defaultValue] - Значение по умолчанию (необязательно)
 */
/**
 * @typedef {Object} DataBaseInfo
 * @property {int} maxRecords - лимит записей в БД
 * @property {int} recordsCount - текущее количество записей
 * @property {int} byteSizeOfRecord - число байт на запись
 * @property {int} memoryUsed - кол-во байт используемое в БД под записи
 * @property {int} allocatedMemory - выделенная память на будущие записи
 * @property {int} allocatedRecords - выделенные записи
 * @property {Field[]} fields - поля БД
 */
/**
 * @typedef {Object} OperationsWithObjectAbstraction
 * @property {function} get
 * @property {function} has
 * @property {function} create
 */
/**
 * @this {databaseFilling}
 */
class databaseFilling{
	/** @type {ArrayBuffer} */
	#dataBuffer=null;
	/** @type {function} */
	#callbackAllocation=null;
	/** @type {Field[]} */
	#fields;
	/** @type {int} */
	#awaitRecords=0;
	/** @type {int} */
	#allocatedRecords=0;
	/** @type {int} */
	#byteSizeOfRecord=0;
	/** @type {DataView} */
	#view=null;
	/** @type {int} */
	#records=0;
	/** @type {CacheStorageOfDataBase} */
	#cacheStorage=null;
	/** @type {int} */
	#startByteOffsetForRecords=0;
	/** @type {int} */
	#countFieldsUniqueValues=0;
	/** @type {int} */
	#countFieldsAnyValues=0;
	/** @type {Field[]} */
	#fieldsAnyValues=null;
	/** @type {Field[]} */
	#fieldsUniqueValues=null;
	/** @type {Map<fieldName, int>} */
	#mapNameFieldToIndexField=null;
	#littleEndian=false;
	constructor(object){
		this.#fields=object.fields;
		this.#awaitRecords=object.awaitRecords;
		this.#byteSizeOfRecord=object.byteSizeOfRecord;
		this.#allocatedRecords=object.allocatedRecords;
		this.#dataBuffer=object.dataBuffer || new ArrayBuffer(this.#allocatedRecords*this.#byteSizeOfRecord, {maxByteLength:object.byteSizeOfRecord*object.awaitRecords});
		this.#view=new DataView(this.#dataBuffer);
		this.#cacheStorage=new CacheStorageOfDataBase(this);
		for(var localfield of this.#fields){
			//Создать кеш-поля для полей уникальных значений
			if(localfield.isFieldOfUniqueValues) {
				++this.#countFieldsUniqueValues;
				this.#cacheStorage.goToFieldUniqueValues(localfield.name);
			} else {
				++this.#countFieldsAnyValues;
			}
			//Создать кеш-поля для обычных полей
		}
		this.#fieldsAnyValues=new Array(this.#countFieldsAnyValues);
		this.#fieldsUniqueValues=new Array(this.#countFieldsUniqueValues);
		this.#mapNameFieldToIndexField=new Map();
		var i=0;
		var indexForFieldUniqueValues=0;
		var indexForFieldAnyValues=0;
		for(var localfield of this.#fields){
			this.#mapNameFieldToIndexField.set(localfield.name, i);
			if(localfield.isFieldOfUniqueValues){
				this.#fieldsUniqueValues[indexForFieldUniqueValues]=localfield;
				++indexForFieldUniqueValues;
			} else {
				this.#fieldsAnyValues[indexForFieldAnyValues]=localfield;
				++indexForFieldAnyValues;
			}
			++i;
		}
		if(object.countRecords>=0){
			//Заполнить кеш при условии наличия записей
			this.#records=object.countRecords;
			for(var localfield of this.#fields){
				if(localfield.isFieldOfUniqueValues) this.#cacheStorage.goToFieldUniqueValues(localfield.name).updateValues();
			}
		}
		if(!object.callbackAllocation) throw Error("Не задан колбек аллокации памяти");
		this.#callbackAllocation=object.callbackAllocation;
		this.#startByteOffsetForRecords=object.bytesForHeader;
		this.#littleEndian=!!(object.littleEndian);
	}
	/**
	 * Добавить запись с данными
	 * @param  {... number | string | boolean} args 
	 */
	addRecord(...args){
		if(this.#records===this.#allocatedRecords) this.#callbackAllocation.call(this, this.#records, this.#awaitRecords);
		for(var i=0; i<this.#fields.length; ++i){
			var localfield = this.#fields[i];
			var valueToBuffer=localfield.defaultValue;
			if( (i<args.length) && (args[i]!==null) ) {
				//Если value задано
				valueToBuffer=args[i];
			} else if(localfield.isFieldOfUniqueValues){
				//Поля под уникальные значения обязаны быть заполнены
				throw Error("Поле уникальных значений обязано обладать значением");
			}
			//Установить значение
			this.#setValueByType(localfield, this.#records, valueToBuffer);
		}
		++this.#records;
		return this;
	}
	/**
	 * Добавить запись с данными с помощью объекта, где key - имя поля, value - значение в буфер
	 * @param {Object} object
	 */
	addRecordByObject(object){
		//Проверить все ли поля unique значений заданы
		var hasAll=true;
		for(var i=0; i<this.#fieldsUniqueValues.length; ++i){
			var localfield=this.#fieldsUniqueValues[i];
			if(!Object.hasOwn(object, localfield.name)){
				hasAll=false;
				break;
			}
		}
		if(hasAll){
			if(this.#records===this.#allocatedRecords) this.#callbackAllocation.call(this, this.#records, this.#awaitRecords);
			for(var key in object){
				var valueToBuffer=object[key];
				var localfield=this.#fields[this.#mapNameFieldToIndexField.get(key)];
				this.#setValueByType(localfield, this.#records, valueToBuffer);
			}
			++this.#records;
		} else throw Error(`Не заданы данные для поля уникальных значений ${localfield.name}`);
		return this;
	}
	/**
	 * Выделить память для записей
	 * @param {int} countRecords 
	 */
	allocateMemoryForRecords(countRecords){
		this.#allocatedRecords+=countRecords;
		this.#dataBuffer.resize(this.#allocatedRecords*this.#byteSizeOfRecord);
		this.#view=new DataView(this.#dataBuffer);
		return this;
	}
	/**
	 * Задать данные записи по индексу.  
	 * Этим методом нельзя создать новые записи
	 * @param {int} indexRecord 
	 * @param  {... number | string | boolean} args 
	 */
	setDataOfRecord(indexRecord, ...args){
		if(indexRecord<0 || indexRecord>=this.#records) throw Error("Первый аргумент - индекс записи для изменения ее данных");
		passArgs: for(var i=0; i<args.length; ++i){
			var localValueOfArg=args[i];
			if(localValueOfArg===null) continue passArgs;
			var localfield=this.#fields[i];
			this.#setValueByType(localfield, indexRecord, localValueOfArg);
		}
		return this;
	}
	/**
	 * Задать данные записи по индексу с помощью объекта, где key - имя поля, value - значение в буфер
	 * Этим методом нельзя создать новые записи
	 * @param {int} indexRecord 
	 * @param {Object} object 
	 */
	setDataOfRecordByObject(indexRecord, object){
		if(indexRecord<0 || indexRecord>=this.#records) throw Error("Первый аргумент - индекс записи для изменения ее данных");
		for(var key in object){
			var valueToBuffer=object[key];
			var localfield=this.#fields[this.#mapNameFieldToIndexField.get(key)];
			this.#setValueByType(localfield, indexRecord, valueToBuffer);
		}
		return this;
	}
	/**
	 * Получить данные из поля в конкретной записи
	 * @param {number} indexRecord 
	 * @param {string} fieldName 
	 * @param {number | string | boolean} value 
	 */
	getDataOfFieldOfRecord(indexRecord, fieldName, value){
		if(indexRecord<0 || indexRecord>=this.#records) throw Error("Первый аргумент - индекс записи для изменения ее данных");
		var fieldIndex=this.#mapNameFieldToIndexField.get(fieldName);
		if(fieldIndex==null) throw Error("Второй аргумент - имя поля. Возможно вы передали поле не существующее");
		return this.#getValueByType(this.#fields[fieldIndex], indexRecord, value);
	}
	/**
	 * Задать данные для поля в конкретной записи
	 * @param {number} indexRecord 
	 * @param {string} fieldName 
	 * @param {number | string | boolean} value 
	 */
	setDataOfFieldOfRecord(indexRecord, fieldName, value){
		if(indexRecord<0 || indexRecord>=this.#records) throw Error("Первый аргумент - индекс записи для изменения ее данных");
		var fieldIndex=this.#mapNameFieldToIndexField.get(fieldName);
		if(fieldIndex==null) throw Error("Второй аргумент - имя поля. Возможно вы передали поле не существующее");
		this.#setValueByType(this.#fields[fieldIndex], indexRecord, value);
	}
	getIndexByFieldName(fieldName){
		return this.#mapNameFieldToIndexField.get(fieldName);
	}
	/**
	 * Найти индекс записи (начать поиск с indexRecord включителельно) с равными данными
	 * @param {int} indexRecord 
	 * @param  {... number | string | boolean} args 
	 * @returns {int}
	 */
	findRecordWithValues(indexRecord, ...args){
		if(indexRecord<0 || indexRecord>this.#records) throw Error("Первый аргумент - номер записи с которой начать поиск");
		var resultIndex=this.#checkRecordInFieldUniqueValues(indexRecord, args);
		switch(resultIndex){
			case -1: break;
			case -2:
				/** @type {Set} */
				var cachedValues=null;
				for(var i=0; i<args.length; ++i){
					var valueOfArg=args[i];
					if(valueOfArg===null) continue;
					var localfield=this.#fields[i];
					if(localfield.isFieldOfUniqueValues) continue;
					if(!cachedValues){
						cachedValues=this.#cacheStorage.goToFieldAnyValues(localfield.name).getCopyIndexesOfValue(valueOfArg);
					} else {
						cachedValues=this.#cacheStorage.goToFieldAnyValues(localfield.name).filterSetBySameValuesInCache(cachedValues, valueOfArg);
					}
					if(cachedValues.size===0) break;
				}
				if(cachedValues.size===0){
					resultIndex=-1;
				} else {
					[resultIndex]=cachedValues;
				}
				break;
			default:
				ifHaveArgInFieldsUniqueValuesPassArgs: for(var localIndexOfArgs=0; localIndexOfArgs<args.length; ++localIndexOfArgs){
					var localfield=this.#fields[localIndexOfArgs];
					var valueOfArg=args[localIndexOfArgs];
					if(localfield.isFieldOfUniqueValues) continue;
					if(valueOfArg!==null){
						var valueOfRecord=this.#getValueByType(localfield, localIndexOfArgs);
						if(valueOfRecord!==valueOfArg){
							resultIndex=-1;
							break ifHaveArgInFieldsUniqueValuesPassArgs;
						}
					}
				}
				break;
		}
		return resultIndex;
	}
	findRecordByArrayArgs(indexRecord, args){
		if(indexRecord<0 || indexRecord>this.#records) throw Error("Первый аргумент - номер записи с которой начать поиск");
		//Ниже код - копия кода для findRecordWithValues. Все изменения того вставлять сюда тоже обязательно.
		var resultIndex=this.#checkRecordInFieldUniqueValues(indexRecord, args);
		switch(resultIndex){
			case -1: break;
			case -2:
				/** @type {Set} */
				var cachedValues=null;
				for(var i=0; i<args.length; ++i){
					var valueOfArg=args[i];
					if(valueOfArg===null) continue;
					var localfield=this.#fields[i];
					if(localfield.isFieldOfUniqueValues) continue;
					if(!cachedValues){
						cachedValues=this.#cacheStorage.goToFieldAnyValues(localfield.name).getCopyIndexesOfValue(valueOfArg);
					} else {
						cachedValues=this.#cacheStorage.goToFieldAnyValues(localfield.name).filterSetBySameValuesInCache(cachedValues, valueOfArg);
					}
					if(cachedValues.size===0) break;
				}
				if(cachedValues.size===0){
					resultIndex=-1;
				} else {
					resultIndex=updatedSetObject.findMinValueInSetOfIndexValues(cachedValues);
				}
				break;
			default:
				ifHaveArgInFieldsUniqueValuesPassArgs: for(var localIndexOfArgs=0; localIndexOfArgs<args.length; ++localIndexOfArgs){
					var localfield=this.#fields[localIndexOfArgs];
					var valueOfArg=args[localIndexOfArgs];
					if(localfield.isFieldOfUniqueValues) continue;
					if(valueOfArg!==null){
						var valueOfRecord=this.#getValueByType(localfield, localIndexOfArgs);
						if(valueOfRecord!==valueOfArg){
							resultIndex=-1;
							break ifHaveArgInFieldsUniqueValuesPassArgs;
						}
					}
				}
				break;
		}
		return resultIndex;
	}
	/**
	 * Найти индекс записи по значениям заданным в объекте, в котором ключ - имя поля, значение - значение
	 * @param {int} indexRecord 
	 * @param {Object} objectOfArgs 
	 * @returns {int}
	 */
	findRecordByObject(indexRecord, objectOfArgs){
		if(indexRecord<0 || indexRecord>this.#records) throw Error("Первый аргумент - номер записи с которой начать поиск");
		var resultIndex=-1;
		/** @type {Set} */
		var cachedValues=null;
		checking:{
			//Если есть поле уникальных значений
			for(var localfieldUniqueValues of this.#fieldsUniqueValues){
				if(Object.hasOwn(objectOfArgs, localfieldUniqueValues.name)){
					var valueOfArg=objectOfArgs[localfieldUniqueValues.name];
					var cache=this.#cacheStorage.goToFieldUniqueValues(localfieldUniqueValues.name);
					//Если в кеше есть такое значение
					if(cache.hasValue(valueOfArg)){
						var indexOfField=cache.getIndexOfValue(valueOfArg);
						//Если индекс найденного поля не ниже indexRecord
						if(indexOfField>=indexRecord){
							//Пройтись по значениям
							for(var localfield of this.#fields){
								if(!Object.hasOwn(objectOfArgs, localfield.name)) continue;
								var valueOfField=objectOfArgs[localfield.name];
								if(valueOfField!==this.#getValueByType(localfield, indexOfField)) break checking;
							}
							resultIndex=this.#mapNameFieldToIndexField.get(localfieldUniqueValues.name);
						}
					}
					break checking;
				}
			}
			//Иначе пройтись по полям any значений
			for(var localfieldAnyValues of this.#fieldsAnyValues){
				if(Object.hasOwn(objectOfArgs, localfieldAnyValues.name)){
					var valueOfArg=objectOfArgs[localfieldAnyValues.name];
					if(!cachedValues){
						cachedValues=this.#cacheStorage.goToFieldAnyValues(localfieldAnyValues.name).getCopyIndexesOfValue(valueOfArg);
					} else {
						cachedValues=this.#cacheStorage.goToFieldAnyValues(localfieldAnyValues.name).filterSetBySameValuesInCache(cachedValues, valueOfArg);
					}
					if(cachedValues.size===0) break;
				}
			}
			if(cachedValues.size>0) {
				resultIndex=updatedSetObject.findMinValueInSetOfIndexValues(indexRecord,cachedValues);
			}
		}
		return resultIndex;
	}
	/**
	 * Вернуть массив индексов с совпадающими значениями в записях
	 * @param {int} indexRecord 
	 * @param {Object} objectOfArgs 
	 * @returns {int[]}
	 */
	findAllRecordsByObject(indexRecord, objectOfArgs){
		if(indexRecord<0 || indexRecord>this.#records) throw Error("Первый аргумент - номер записи с которой начать поиск");
		var arrayIndexRecords=null;
		/** @type {Set} */
		var cachedValues=null;
		checking:{
			//Если есть поле уникальных значений
			for(var localfieldUniqueValues of this.#fieldsUniqueValues){
				if(Object.hasOwn(objectOfArgs, localfieldUniqueValues.name)){
					arrayIndexRecords=[];
					var valueOfArg=objectOfArgs[localfieldUniqueValues.name];
					var cache=this.#cacheStorage.goToFieldUniqueValues(localfieldUniqueValues.name);
					//Если в кеше есть такое значение
					if(cache.hasValue(valueOfArg)){
						var indexOfField=cache.getIndexOfValue(valueOfArg);
						//Если индекс найденного поля не ниже indexRecord
						if(indexOfField>=indexRecord){
							//Пройтись по значениям
							for(var localfield of this.#fields){
								if(!Object.hasOwn(objectOfArgs, localfield.name)) continue;
								var valueOfField=objectOfArgs[localfield.name];
								if(valueOfField!==this.#getValueByType(localfield, indexOfField)) break checking;
							}
							arrayIndexRecords[0]=this.#mapNameFieldToIndexField.get(localfieldUniqueValues.name);
						}
					}
					break checking;
				}
			}
			//Иначе пройтись по полям any значений
			for(var localfieldAnyValues of this.#fieldsAnyValues){
				if(Object.hasOwn(objectOfArgs, localfieldAnyValues.name)){
					var valueOfArg=objectOfArgs[localfieldAnyValues.name];
					if(!cachedValues){
						cachedValues=this.#cacheStorage.goToFieldAnyValues(localfieldAnyValues.name).getCopyIndexesOfValue(valueOfArg);
					} else {
						cachedValues=this.#cacheStorage.goToFieldAnyValues(localfieldAnyValues.name).filterSetBySameValuesInCache(cachedValues, valueOfArg);
					}
					if(cachedValues.size===0) break;
				}
			}
			arrayIndexRecords=[...cachedValues];
		}
		return arrayIndexRecords;
	}
	/**
	 * Вернуть индекс записи со значением совпадающим в поле уникальных значений  
	 * Если таких нет - вернуть -1
	 * @param {string} fieldName 
	 * @param {number | string} value 
	 * @returns {int}
	 */
	findRecordWithValueInFieldUniqueValues(fieldName, value){
		if (!this.#mapNameFieldToIndexField.has(fieldName)) throw Error("Поля с таким именем нет");
		var resultIndex=-1;
		var cacheOfField=this.#cacheStorage.goToFieldUniqueValues(fieldName);
		if(cacheOfField.hasValue(value)) resultIndex=cacheOfField.getIndexOfValue(value);
		return resultIndex;
	}
	/**
	 * Вернуть true, если данные записи совпадают с аргументами
	 * @param {int} indexRecord 
	 * @param  {...number | string | boolean} args 
	 * @returns {boolean}
	 */
	checkValuesInRecord(indexRecord, ...args){
		var result=true;
		for(var i=0; i<args.length; ++i){
			var valueOfArg=args[i];
			if(valueOfArg===null) continue;
			var localfield=this.#fields[i];
			if(valueOfArg!==this.#getValueByType(localfield, indexRecord)){
				result=false;
				break;
			}
		}
		return result;
	}
	/**
	 * Возвращает -2, если значения для полей уникальных значений не указано  
	 * Возвращает -1, если значение для поля уникальных значений было указано, но они неравны  
	 * Иначе: вернуть индекс записи с совпадением
	 * @param {int} indexToStart 
	 * @param {(number | string | boolean | null)[]} args 
	 * @returns {int}
	 */
	#checkRecordInFieldUniqueValues(indexToStart, args){
		var resultIndex=-2;
		//Проверить поля уникальных значений
		for(var i=0; i<args.length; ++i){
			var localfield=this.#fields[i];
			if(localfield.isFieldOfUniqueValues){
				resultIndex=-1;
				if(args[i]!==null){
					resultIndex=this.#cacheStorage.goToFieldUniqueValues(localfield.name).getIndexOfValue(args[i]);
					if( (resultIndex===undefined) || (indexToStart>resultIndex)) resultIndex=-1;
					break;
				}
			}
		}
		return resultIndex;
	}
	/**
	 * Вернет массив объектов полей БД.  
	 * Изменение этих объектов не повлияет на работу БД (условно получите копию полей)
	 * @returns {Field[]}
	 */
	getFields(){
		return this.#fields.map(elem=>(
			{...elem})
		);
	}
	/**
	 * Получить массив с данными поля из каждой записи
	 * @param {string} fieldName 
	 * @returns {(number | string | boolean)[]}
	 */
	getValuesOfField(fieldName){
		var localfield=this.#fields.find(elem=>elem.name===fieldName);
		var array=new Array(this.#records);
		for(var i=0; i<this.#records; ++i){
			array[i]=this.#getValueByType(localfield, i);
		}
		return array;
	}
	/**
	 * Возвращает число байт, занятое на данные
	 * @returns {int}
	 */
	getUsedMemory(){
		return this.#records*this.#byteSizeOfRecord
	}
	/**
	 * Получить кол-во байт на запись
	 * @returns {int}
	 */
	getByteSizeOfRecord(){
		return this.#byteSizeOfRecord;
	}
	/**
	 * Получить количество записей в БД
	 * @returns {int}
	 */
	getRecordsCount(){
		return this.#records;
	}
	/**
	 * Получить массив с объектами-данными записей
	 * @returns {[Object]}
	 */
	getRecordsInfo(){
		var records=[];
		for(var i=0; i<this.#records; ++i){
			var localRecord={};
			var localoffset=i*this.#byteSizeOfRecord;
			for(var localfield of this.#fields){
				localRecord[localfield.name]=this.#getValueByType(localfield, i);
				localoffset+=localfield.byteSize;
			}
			records.push(localRecord);
		}
		return records;
	}
	/**
	 * Получить массив с определенным количеством объектов-данных записей  
	 * Начинать с индекса.
	 * @param {int} indexRecord
	 * @param {int} countRecords 
	 * @returns {Object[]}
	 */
	getInfoSomeRecords(indexRecord, countRecords){
		var records=new Array(countRecords);
		var localI=0;
		for(var i=0; i<countRecords; ++i){
			var localRecord={};
			var localoffset=indexRecord*this.#byteSizeOfRecord;
			for(var localfield of this.#fields){
				localRecord[localfield.name]=this.#getValueByType(localfield, indexRecord);
				localoffset+=localfield.byteSize;
			}
			records[localI]=localRecord;
			++indexRecord;
			++localI;
		}
		return records;
	}
	/**
	 * Получить объект с некоторыми данными БД  
	 * Используйте при сохранении данных в файлы  
	 * - **maxRecords** - лимит записей в БД
	 * - **recordsCount** - текущее количество записей
	 * - **byteSizeOfRecord** - число байт на запись
	 * - **memoryUsed** - кол-во байт используемое в БД под записи
	 * - **allocatedMemory** - выделенная память на будущие записи
	 * - **allocatedRecords** - выделенные записи
	 * - **fields** - поля БД
	 * - **littleEndian** - порядок записи байт
	 * @returns DataBaseInfo
	 */
	getInfo(){
		return {
			maxRecords:this.#awaitRecords,
			recordsCount: this.#records,
			byteSizeOfRecord: this.#byteSizeOfRecord,
			memoreUsed: this.#byteSizeOfRecord*this.#records,
			allocatedMemory: this.#dataBuffer.byteLength-this.#byteSizeOfRecord*this.#records,
			allocatedRecords: this.#allocatedRecords,
			fields:this.getFields(),
			littleEndian:this.#littleEndian
		}
	}
	/**
	 * @param {versionsToSaving} version 
	 * Получить ArrayBuffer этой БД  
	 * Используйте при сохранении данных в файлы  
	 * При создании БД из createFromJSON укажите в objectSettings property - version
	 */
	getBufferByVersion(version){
		var copyOfBuffer=new ArrayBuffer(this.#records*this.#byteSizeOfRecord, {
			maxByteLength:this.#records*this.#byteSizeOfRecord+(this.#records*this.#fields.length*8)
		});
		var viewOnCopy=new DataView(copyOfBuffer);
		for(var countRecord=0; countRecord<this.#records; ++countRecord){
			for(var localfield of this.#fields){
				var startoffset=localfield.offset*countRecord
				var localoffset=startoffset;
				switch(localfield.type){
					case "UTF-8":
					case "String8":
						var endOffset=(startoffset+localfield.byteSize);
						for(localoffset; localoffset<endOffset; ++localoffset){
							if(this.#view.getUint8(localoffset)===0) break;
						}
						if(localfield.byteSize<255){
							this.#view.setUint8(localfield.byteSize);
							break;
						} else if(localfield.byteSize<65_535){
							this.#view.setUint8(localfield.byteSize);
							break;
						} else if(localfield.byteSize<16_777_215){
							this.#view.setUint8(localfield.byteSize);
							break;
						}
						break;
					case "UTF-16":
					case "String16":
						var endOffset=(startoffset+localfield.byteSize);
						for(localoffset; localoffset<endOffset; ++localoffset){
							if(this.#view.getUint16(localoffset)===0) break;
						}
						break;
					default:
						//On number | bool types
						
						break;
				}
			}
		}
		return copyOfBuffer;
	}
	/**
	 * Получить объект с данными записи по индексу
	 * @param {int} indexRecord 
	 */
	getDataFromRecord(indexRecord){
		var objectResult={};
		for(var localfield of this.#fields){
			objectResult[localfield.name]=this.#getValueByType(localfield, indexRecord);
		}
		return objectResult;
	}
	getDataFromFieldOfRecord(indexRecord, fieldName){
		return (this.#getValueByType(this.#fields[this.#mapNameFieldToIndexField.get(fieldName)], indexRecord));
	}
	/** @type {Map<fieldName, ObjectAbstractionAboveDataBase>} */
	#storageOfObjectAbstractionAboveDB=new Map()
	/**
	 * Создать object-абстракцию над БД для удобной работы, где ключ - значения из поля уникальных значений
	 * @param {string} fieldName 
	 * @returns {OperationsWithObjectAbstraction}
	 */
	createObjectAbstractionWithKeyIsUniqueField(fieldName){
		var keyFieldIndex=this.#mapNameFieldToIndexField.get(fieldName);
		if(!this.#fields[keyFieldIndex].isFieldOfUniqueValues) throw Error("Object-абстракцию можно создавать только из полей уникальных значений");
		var objectAbstraction=this.#storageOfObjectAbstractionAboveDB.get(fieldName);
		if(!objectAbstraction){
			var thisForObjectAbstraction={
				setValue:this.#setValueByType,
				getValue:this.#getValueByType,
				fields:this.#fields,
				keyFieldIndex:this.#mapNameFieldToIndexField.get(fieldName),
				thisReference:this,
				keyField:this.#fields[this.#mapNameFieldToIndexField.get(fieldName)]
			}
			objectAbstraction=new ObjectAbstractionAboveDataBase(fieldName, thisForObjectAbstraction)
		}
		return objectAbstraction;
	}
	/**
	 * 
	 * @param {Field} localfield 
	 * @param {int} recordIndex 
	 * @returns {number | string | boolean}
	 */
	#getValueByType(localfield, recordIndex){
		var type=localfield.type;
		var localoffset=this.#startByteOffsetForRecords+recordIndex*this.#byteSizeOfRecord+localfield.offset;
		var result=0;
		var localView=this.#view;
		switch(type){
			case "Int8":
				result=localView.getInt8(localoffset);
				break;
			case "Int16":
				result=localView.getInt16(localoffset);
				break;
			case "Int32":
				result=localView.getInt32(localoffset);
				break;
			case "Uint8":
				result=localView.getUint8(localoffset);
				break;
			case "Uint16":
				result=localView.getUint16(localoffset);
				break;
			case "Uint32":
				result=localView.getUint32(localoffset);
				break;
			case "BigInt64":
				result=localView.getBigInt64(localoffset);
				break;
			case "BigUint64":
				result=localView.getBigUint64(localoffset);
				break;
			case "Float16":
				result=localView.getFloat16(localoffset);
				break;
			case "Float32":
				result=localView.getFloat32(localoffset);
				break;
			case "Float64":
				result=localView.getFloat64(localoffset);
				break;
			case "UTF-8":
			case "String8":
				var strconstruct=String;
				result="";
				var byteOffset=localoffset;
				var firstByte=0;
				var secondByte=0;
				var thirdByte=0;
				var fourthByte=0;
				for(byteOffset; byteOffset<(localoffset+localfield.byteSize);){
					firstByte=localView.getUint8(byteOffset);
					if(firstByte===0) break;
					else if(firstByte<128){
						//1 байт
						result+=String.fromCodePoint(firstByte);
						byteOffset+=1;
					} else if(firstByte<224){
						//2 байта
						firstByte=firstByte & 0b00011111;
						secondByte=localView.getUint8(byteOffset+1) & 63;
						result+=String.fromCodePoint((firstByte<<6) | secondByte)
						byteOffset+=2;
					}  else if(firstByte<240){
						//3 байта
						firstByte=firstByte & 0b00001111;
						secondByte=localView.getUint8(byteOffset+1) & 63;
						thirdByte=localView.getUint8(byteOffset+2) & 63;
						result+=String.fromCodePoint((firstByte<<12) | (secondByte<<6) | thirdByte);
						byteOffset+=3;
					} else if(firstByte>=240){
						//4 байта
						firstByte=firstByte & 0b00000111;
						secondByte=localView.getUint8(byteOffset+1) & 63;
						thirdByte=localView.getUint8(byteOffset+2) & 63;
						fourthByte=localView.getUint8(byteOffset+3) & 63;
						result+=String.fromCodePoint((firstByte<<18) | (secondByte<<12) | (thirdByte<<6) |fourthByte);
						byteOffset+=4;
					}
				}
				break;
			case "UTF-16":
			case "String16":
				var strconstruct=String;
				result="";
				for(var i=0; i<localfield.byteSize/2; ++i){
					var codeChar=localView.getUint16(localoffset+i*2, true);
					if(codeChar===0) break;
					result+=strconstruct.fromCharCode(codeChar);
				}
				break;
			case "Bool":
			case "Boolean":
				result=(!!localView.getUint8(localoffset));
				break;
			default: throw Error("Неизвестный тип");
		}
		return result;
	}
	/**
	 * 
	 * @param {Field} localfield 
	 * @param {int} recordIndex 
	 * @param {number | string | boolean} valueToBuffer 
	 */
	#setValueByType(localfield, recordIndex, valueToBuffer){
		var type=localfield.type;
		var localView=this.#view;
		var localoffset=this.#startByteOffsetForRecords+recordIndex*this.#byteSizeOfRecord+localfield.offset;
		this.#checkTypeValueWithFieldValue(localfield, valueToBuffer);
		if(localfield.isFieldOfUniqueValues){
			//Кеш уникальных значений
			var cacheFieldUniqueValues=this.#cacheStorage.goToFieldUniqueValues(localfield.name);
			if(cacheFieldUniqueValues.hasValue(valueToBuffer)) throw Error("Поля уникальных значений не могут содержать дубликаты");
			cacheFieldUniqueValues.replaceValue(recordIndex, valueToBuffer);
		} else {
			//Кеш обычных полей
			var cacheFieldAnyValues=this.#cacheStorage.goToFieldAnyValues(localfield.name);
			cacheFieldAnyValues.replaceValue(recordIndex, valueToBuffer);
		}
		switch(type){
			case "Int8":
				localView.setInt8(localoffset, valueToBuffer);
				break;
			case "Int16":
				localView.setInt16(localoffset, valueToBuffer, this.#littleEndian);
				break;
			case "Int32":
				localView.setInt32(localoffset, valueToBuffer, this.#littleEndian)
				break;
			case "Uint8":
				localView.setUint8(localoffset, valueToBuffer);
				break;
			case "Uint16":
				localView.setUint16(localoffset, valueToBuffer, this.#littleEndian);
				break;
			case "Uint32":
				localView.setUint32(localoffset, valueToBuffer, this.#littleEndian)
				break;
			case "BigInt64":
				localView.setBigInt64(localoffset, valueToBuffer, this.#littleEndian);
				break;
			case "BigUint64":
				localView.setBigUint64(localoffset, valueToBuffer, this.#littleEndian);
				break;
			case "Float16":
				localView.setFloat16(localoffset, valueToBuffer, this.#littleEndian);
				break;
			case "Float32":
				localView.setFloat32(localoffset, valueToBuffer, this.#littleEndian)
				break;
			case "Float64":
				localView.setFloat64(localoffset, valueToBuffer, this.#littleEndian)
				break;
			case "UTF-8":
			case "String8":
				if(valueToBuffer!==""){
					if((this.#getLengthOfUTF8(valueToBuffer))>localfield.byteSize) throw Error("Кол-во байтов значения больше возможного");
					var byteOffset=localoffset;
					for(var char of valueToBuffer){
						var codePoint=char.codePointAt(0);
						if(codePoint<128){
							localView.setUint8(byteOffset, codePoint);
							byteOffset+=1;
						} else if(codePoint<2048){
							localView.setUint8(byteOffset, 192 | (codePoint>>6));
							localView.setUint8(byteOffset+1, 128 | (codePoint & 63));
							byteOffset+=2;
						} else if(codePoint<65536){
							localView.setUint8(byteOffset, 224 | (codePoint>>12));
							localView.setUint8(byteOffset+1, 128 | (codePoint>>6 & 63));
							localView.setUint8(byteOffset+2, 128 | (codePoint & 63));
							byteOffset+=3;
						} else if(codePoint<4194304){
							localView.setUint8(byteOffset, 240 | (codePoint>>18));
							localView.setUint8(byteOffset+1, 128 | (codePoint>>12 & 63));
							localView.setUint8(byteOffset+2, 128 | (codePoint>>6 & 63));
							localView.setUint8(byteOffset+3, 128 | (codePoint & 63));
							byteOffset+=4;
						}
					}
					if(byteOffset<(localoffset+localfield.byteSize)){
						localView.setUint8(byteOffset, 0);
					}
				} else localView.setUint8(localoffset, 0);
				break;
			case "UTF-16":
			case "String16":
				if(valueToBuffer!==""){
					if((valueToBuffer.length*2)>localfield.byteSize) throw Error("Кол-во байтов значения больше возможного");
					var byteOffset=localoffset;
					for(var i=0; i<valueToBuffer.length; ++i){
						var codeChar=valueToBuffer.charCodeAt(i);
						localView.setUint16(byteOffset, codeChar, true);
						byteOffset+=2;
					}
					if((byteOffset+2)<=(localoffset+localfield.byteSize)){
						localView.setUint16(byteOffset, 0, this.#littleEndian);
					}
				} else localView.setUint16(localoffset, 0, this.#littleEndian);
				break;
			case "Bool":
			case "Boolean":
				if(valueToBuffer==false) localView.setUint8(localoffset, 0);
				else localView.setUint8(localoffset, 1);
				break;
			default: throw Error("Неизвестный тип");
		}
	}
	#checkTypeValueWithFieldValue(localfield, valueToField){
		var success=false;
		switch(localfield.type){
			case "Uint8":
			case "Int8":
			case "Uint16":
			case "Int16":
			case "Uint32":
			case "Int32":
			case "Float16":
			case "Float32":
			case "Float64":
				if(typeof valueToField==="number") success=true;
				break;
			case "BigInt64":
			case "BigUint64":
				if(typeof valueToField==="bigint") success=true;
				break;
			case "ASCII":
			case "UTF-8":
			case "UTF-16":
			case "String8":
			case "String16":
				if(typeof valueToField==="string") success=true;
				break;
			case "Bool":
			case "Boolean":
				if(typeof valueToField==="boolean") success=true;
				break;
		}
		if(!success) throw Error(`Поле ${localfield.name} ожидает тип ${localfield.type}. Передано было значение: ${valueToField}`);
		return success;
	}
	/**
	 * Получить число байт для строки UTF-16 при ее UTF-8 виде
	 * @param {string} string16 
	 * @returns 
	 */
	#getLengthOfUTF8(string16){
		var result=0;
		for(var char of string16){
			var codePoint=char.codePointAt(0);
			if(codePoint<=127) result+=1;
			else if(codePoint<2048) result+=2;
			else if(codePoint<65536) result+=3;
			else result+=4;
		}
		return result;
	}
}
function getByteSizeFromType(type){
	var value=0;
	switch(type){
		case "Uint8":
		case "Int8":
		case "UTF-8":
		case "String8":
		case "ASCII":
			value=1;
			break;
		case "Uint16":
		case "Int16":
		case "UTF-16":
		case "String16":
		case "Float16":
			value=2;
			break;
		case "Uint32":
		case "Int32":
		case "Float32":
			value=4;
			break;
		case "BigUint64":
		case "BigInt64":
		case "Float64":
			value=8;
			break;
		default: throw Error("Неизвестный тип");
	}
	return value;
}
/**
 * @typedef {object} objectThisForWorkCacheFieldsUniqueValues
 * @property {databaseFilling} db
 * @property {string} fieldName
 * @property {Map} cacheOfFieldUniqueValues
 * @property {Field} localfield
 */
/**
 * @typedef {Map<number | string | boolean, Set<int>>} cacheOfFieldAnyValues
 */
/**
 * @typedef {object} objectThisForWorkCacheFieldsAnyValues
 * @property {databaseFilling} db
 * @property {string} fieldName
 * @property {cacheOfFieldAnyValues} cacheOfFieldAnyValues
 * @property {Field} localfield
 * @property {updatedSetObject} updatedSetObject
 */
/**
 * @typedef {object} operationsWithCacheFieldUniqueValues
 * @property {function} addValue
 * @property {function} hasValue
 * @property {function} replaceValue
 * @property {function} getIndexOfValue
 * @property {function} getCachingValues
 */
/**
 * @typedef {object} operationsWithCacheFieldAnyValues
 * @property {function} addValue
 * @property {function} hasValue
 * @property {function} replaceValue
 * @property {function} getCachingValues
 * @property {function} getCopyOfCachingValues
 * @property {function} getIndexesOfValue
 * @property {function(number | string | boolean): Set} getCopyIndexesOfValue Получить копию Set объекта с индексами где лежит значение
 * 
 * @property {function(Set, number | string | boolean): Set} filterSetBySameValuesInCache  
 * Фильтрует значения переданного Set-object по принципу "какие данные есть у обоих" с кешем индексов значения, переданного во второй аргумент
 */
class CacheStorageOfDataBase {
	#collectionFuncsForCacheFieldUniqueValues={
		/**
		 * @this {objectThisForWorkCacheFieldsUniqueValues}
		 * @param {number | string} value 
		 */
		hasValue(value){
			return this.cacheOfFieldUniqueValues.has(value);
		},
		/**
		 * @this {objectThisForWorkCacheFieldsUniqueValues}
		 * @param {int} indexRecord 
		 * @param {number | string} value 
		 */
		replaceValue(indexRecord, value){
			this.cacheOfFieldUniqueValues.delete(this.db.getDataFromFieldOfRecord(indexRecord, this.fieldName));
			this.cacheOfFieldUniqueValues.set(value, indexRecord);
		},
		/**
		 * @this {objectThisForWorkCacheFieldsUniqueValues}
		 * @param {number | string} value 
		 */
		getIndexOfValue(value){
			return this.cacheOfFieldUniqueValues.get(value);
		},
		/** @this {objectThisForWorkCacheFieldsUniqueValues}*/
		updateValues(){
			this.cacheOfFieldUniqueValues.clear();
			for(var i=0; i<this.db.getRecordsCount(); ++i){
				this.cacheOfFieldUniqueValues.set(this.db.getDataFromFieldOfRecord(i, this.fieldName), i)
			}
		},
		/** @this {objectThisForWorkCacheFieldsUniqueValues}*/
		getCachingValues(){
			return (this.cacheOfFieldUniqueValues);
		}
	}
	#collectionFuncsForCacheFieldAnyValues={
		/** @this {objectThisForWorkCacheFieldsAnyValues} */
		replaceValue(indexRecord, value){
			var oldValue=this.db.getDataFromFieldOfRecord(indexRecord, this.fieldName);
			if(this.cacheOfFieldAnyValues.has(oldValue)){
				this.cacheOfFieldAnyValues.get(oldValue).delete(indexRecord);
				if(this.cacheOfFieldAnyValues.get(oldValue).size===0) this.cacheOfFieldAnyValues.delete(oldValue)
			}
			var cacheIndexesOfValue=this.cacheOfFieldAnyValues.get(value);
			if(!cacheIndexesOfValue){
				cacheIndexesOfValue=new Set();
				this.cacheOfFieldAnyValues.set(value, cacheIndexesOfValue);
			}
			cacheIndexesOfValue.add(indexRecord);
		},
		/** @this {objectThisForWorkCacheFieldsAnyValues} */
		updateValues(){
			this.cacheOfFieldAnyValues.clear();
			for(var i=0; i<this.db.getRecordsCount(); ++i){
				var valueInRecord=this.db.getDataFromFieldOfRecord(i, this.fieldName);
				var cacheOfValue=this.cacheOfFieldAnyValues.get(valueInRecord);
				if(!cacheOfValue){
					cacheOfValue=new Set();
					this.cacheOfFieldAnyValues.set(valueInRecord, cacheOfValue);
				}
				cacheOfValue.add(i);
			}
		},
		/** @this {objectThisForWorkCacheFieldsAnyValues} */
		getCachingValues(){
			return (this.cacheOfFieldAnyValues);
		},
		/** @this {objectThisForWorkCacheFieldsAnyValues}*/
		getCopyOfCachingValues(){
			return new Set(this.cacheOfFieldAnyValues);
		},
		/** @this {objectThisForWorkCacheFieldsAnyValues} */
		getIndexesOfValue(value){
			return this.cacheOfFieldAnyValues.get(value)
		},
		/** @this {objectThisForWorkCacheFieldsAnyValues} */
		getCopyIndexesOfValue(value){
			return new Set(this.cacheOfFieldAnyValues.get(value));
		},
		/** @this {objectThisForWorkCacheFieldsAnyValues} */
		filterSetBySameValuesInCache(setObj, value){
			return this.updatedSetObject.toFormWithSameValues(setObj, this.cacheOfFieldAnyValues.get(value));
		}
	}
	#mapOfObjectsToWorkWithCacheFieldsUniqueValues=new Map();
	#mapOfObjectsToWorkWithCacheFieldsAnyValues=new Map();
	/** @type {databaseFilling} */
	#savedData=null;
	/** @param {databaseFilling} objectDB */
	constructor(objectDB){
		this.#savedData=objectDB;
	}
	/** @returns {operationsWithCacheFieldUniqueValues} */
	goToFieldUniqueValues(fieldName){
		/** @type {objectThisForWorkCacheFieldsUniqueValues} */
		var operationsWithCacheFieldUniqueValues=this.#mapOfObjectsToWorkWithCacheFieldsUniqueValues.get(fieldName);
		if(!operationsWithCacheFieldUniqueValues){
			var cacheOfField=new Map();
			/** @type {objectThisForWorkCacheFieldsUniqueValues}*/
			var objectForWork={db:this.#savedData, fieldName, cacheOfFieldUniqueValues:cacheOfField, localfield:this.#savedData.getFields().find(elem=>elem.name===fieldName)};
			operationsWithCacheFieldUniqueValues={
				hasValue:this.#collectionFuncsForCacheFieldUniqueValues.hasValue.bind(objectForWork),
				replaceValue:this.#collectionFuncsForCacheFieldUniqueValues.replaceValue.bind(objectForWork),
				getIndexOfValue:this.#collectionFuncsForCacheFieldUniqueValues.getIndexOfValue.bind(objectForWork),
				updateValues:this.#collectionFuncsForCacheFieldUniqueValues.updateValues.bind(objectForWork),
				getCachingValues:this.#collectionFuncsForCacheFieldUniqueValues.getCachingValues.bind(objectForWork)
			}
			this.#mapOfObjectsToWorkWithCacheFieldsUniqueValues.set(fieldName, operationsWithCacheFieldUniqueValues);
		}
		return operationsWithCacheFieldUniqueValues;
	}
	/** @returns {operationsWithCacheFieldAnyValues} */
	goToFieldAnyValues(fieldName){
		/** @type {operationsWithCacheFieldAnyValues} */
		var operationsWithCacheFieldAnyValues=this.#mapOfObjectsToWorkWithCacheFieldsAnyValues.get(fieldName);
		if(!operationsWithCacheFieldAnyValues){
			var cacheOfField=new Map();
			var objectForWork={db:this.#savedData, fieldName, cacheOfFieldAnyValues:cacheOfField, localfield:this.#savedData.getFields().find(elem=>elem.name===fieldName), updatedSetObject};
			operationsWithCacheFieldAnyValues={
				replaceValue:this.#collectionFuncsForCacheFieldAnyValues.replaceValue.bind(objectForWork),
				getCachingValues:this.#collectionFuncsForCacheFieldAnyValues.getCachingValues.bind(objectForWork),
				getCopyOfCachingValues:this.#collectionFuncsForCacheFieldAnyValues.getCopyOfCachingValues.bind(objectForWork),
				updateValues:this.#collectionFuncsForCacheFieldAnyValues.updateValues.bind(objectForWork),
				getIndexesOfValue:this.#collectionFuncsForCacheFieldAnyValues.getIndexesOfValue.bind(objectForWork),
				getCopyIndexesOfValue:this.#collectionFuncsForCacheFieldAnyValues.getCopyIndexesOfValue.bind(objectForWork),
				filterSetBySameValuesInCache:this.#collectionFuncsForCacheFieldAnyValues.filterSetBySameValuesInCache.bind(objectForWork)
			}
			this.#mapOfObjectsToWorkWithCacheFieldsAnyValues.set(fieldName, operationsWithCacheFieldAnyValues);
		}
		return operationsWithCacheFieldAnyValues;
	}
}
/**
 * @typedef {Object} thisForObjectRecord
 * Создан чтобы использовать для манипуляции данных в БД с помощью получаемых объектов из абстракции
 * @property {Field[]} fields
 * Массив полей в БД  
 * Задается при создании абстракции
 * @property {Field} localfield
 * Поле из которого получать/задавать данные  
 * Задается при использовании метода get от объекта-абстракции
 * @property {function} getValue
 * Метод для получения данных  
 * Задается при создании абстракции
 * @property {function} setValue
 * Метод для задавания данных  
 * Задается при создании абстракции
 * @property {databaseFilling} thisReference
 * Ссылается на класс databaseFilling с его обычными методами  
 * Задается при создании абстракции
 * @property {int} indexRecord
 * Индекс записи с которой работать  
 * Задается при использовании метода get от объекта-абстракции
 * @property {int} keyFieldIndex
 * Индекс поля из которого создана абстракция  
 * Задается при создании абстракции
 * @property {Field} keyField
 * Поле из которого создана абстракция  
 * Задается при создании абстракции
 */
var collectionOfGettersSettersForObjectRecord={
	/** @this {thisForObjectRecord} */
	get(){
		return this.getValue.call(this.thisReference, this.localfield, this.indexRecord)
	},
	/** @this {thisForObjectRecord} */
	set(value){
		this.setValue.call(this.thisReference, this.localfield, this.indexRecord, value)
	}
}
class ObjectAbstractionAboveDataBase{
	/** @type {thisForObjectRecord} */
	#thisForWork=null;
	#cacheObObjects=new Map();
	#fields=null;
	#key="";
	/** @type {databaseFilling} */
	#thisReference=null;
	/**
	 * 
	 * @param {fieldName} key 
	 * @param {thisForObjectRecord} object 
	 */
	constructor(key, object){
		this.#key=key;
		this.#fields=object.fields;
		this.#thisForWork=object;
		this.#thisReference=object.thisReference;
	}
	/**
	 * Вернуть объект с getter, setter для манипуляции данными записи
	 * @param {number | string} key 
	 * @returns {Object}
	 */
	get(key){
		var objectRecord=this.#cacheObObjects.get(key);
		if(!objectRecord){
			objectRecord={}
			for(var localfield of this.#fields){
				if(localfield.name!==key){
					var objectForWork=Object.assign(
						{
							indexRecord:this.#thisReference.findRecordWithValueInFieldUniqueValues(this.#thisForWork.keyField.name, key),
							localfield
						},
						this.#thisForWork
					)
					Object.defineProperty(objectRecord,localfield.name,{
						get:collectionOfGettersSettersForObjectRecord.get.bind(objectForWork),
						set:collectionOfGettersSettersForObjectRecord.set.bind(objectForWork)
					})
				}
			}
		}
		return objectRecord;
	}
	has(key){
		return this.#thisReference.findRecordWithValueInFieldUniqueValues(this.#thisForWork.keyField.name, key)
	}
	createByObject(key, objectOfArgs){
		var localarrayOfArgs=new Array(this.#fields.length).fill(null);
		localarrayOfArgs[this.#thisForWork.keyFieldIndex]=key;
		this.#thisReference.findRecordWithValueInFieldUniqueValues(this.#thisForWork.keyField.name)
		if(this.#thisReference.findRecordWithValues(0, ...localarrayOfArgs)>=0) throw Error(`Запись ${key} имеется в объекте`);
		for(var stringProp in objectOfArgs){
			if(this.#key!==stringProp){
				var valueOfObject=objectOfArgs[stringProp];
				var indexToPutValue=this.#fields.findIndex(elem=>elem.name===stringProp);
				if(indexToPutValue!==-1) localarrayOfArgs[indexToPutValue]=valueOfObject;
			}
		}
		this.#thisForWork.thisReference.addRecord(...localarrayOfArgs)
	}
}
var updatedSetObject={
	/**
	 * Возвращает измененный Set объект переданный в первый аргумент  
	 * @param {Set} objectSet 
	 * @param {Set} secondObjectSet 
	 * @returns {Set}
	 */
	toFormWithDifferentValues(objectSet, secondObjectSet){
		for(var value of secondObjectSet){
			if(objectSet.has(value)) objectSet.delete(value);
		}
		return objectSet
	},
	/**
	 * Возвращает измененный Set объект переданный в первый аргумент  
	 * @param {Set} objectSet 
	 * @param {Set} secondObjectSet 
	 * @returns {Set}
	 */
	toFormWithSameValues(objectSet, secondObjectSet){
		for(var value of objectSet){
			if(!secondObjectSet.has(value)) objectSet.delete(value);
		}
		return objectSet
	},
	/**
	 * Вернуть копию Set объекта  
	 * @param {Set} objectSet 
	 * @returns {Set}
	 */
	getCopy(objectSet){
		return new Set(objectSet);
	},
	/**
	 * Найти минимальное значение в Set-объекте, но которое больше index  
	 * Если такого не найдено, вернет -1
	 * @param {int} index 
	 * @param {Set<int>} setObj 
	 * @returns 
	 */
	findMinValueInSetOfIndexValues(index, setObj){
		var resultIndex=-1;
		var localI=Infinity;
		for(var indexValueInSet of setObj){
			if(indexValueInSet<index) continue;
			if(indexValueInSet<localI){
				localI=indexValueInSet;
			}
		}
		if(localI!==Infinity) resultIndex=localI;
		return resultIndex;
	}
}
export default DB;
