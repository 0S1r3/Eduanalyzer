// store.js

// приватное хранилище
const _store = {
    classNumber: null,    // номер класса, число
    classLetter: null,    // буква класса, строка
    subjectId:   null,    // id предмета, целое число
    teacherId:   null,    // id учителя, целое число
    analysis:    null,    // Анализ, строка
    year:        null,    // Год, строка
    thresholdA:  null,    // порог A, float
    thresholdB:  null,    // порог B, float
    thresholdC:  null,     // порог C, float
    thresholdX:  null,    // порог X, float
    thresholdY:  null,    // порог Y, float
    thresholdZ:  null,     // порог Z, float
    typeAnalyze: null, // тип анализа, строка
  };
  
  // ——— ГЕТТЕРЫ ———
  export function getClassNumber() { return _store.classNumber; }
  export function getClassLetter() { return _store.classLetter; }
  export function getSubjectId()   { return _store.subjectId; }
  export function getTeacherId()   { return _store.teacherId; }
  export function getAnalysis()    { return _store.analysis; }
  export function getYear()        { return _store.year; }
  export function getThresholdA()  { return _store.thresholdA; }
  export function getThresholdB()  { return _store.thresholdB; }
  export function getThresholdC()  { return _store.thresholdC; }
  export function getThresholdX()  { return _store.thresholdX; }
  export function getThresholdY()  { return _store.thresholdY; }
  export function getThresholdZ()  { return _store.thresholdZ; }
  export function getTypeAnalyze()  { return _store.typeAnalyze; }
  
  // ——— СЕТТЕРЫ ———
  export function setClassNumber(num) {
    if (typeof num !== 'number' || num <= 0) {
      throw new Error('classNumber must be a positive number');
    }
    _store.classNumber = num;
  }
  
  export function setClassLetter(letter) {
    if (typeof letter !== 'string' || letter.length !== 1) {
      throw new Error('classLetter must be a single character string');
    }
    _store.classLetter = letter;
  }
  
  export function setSubjectId(id) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('subjectId must be a positive integer');
    }
    _store.subjectId = id;
  }
  
  export function setTeacherId(id) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('teacherId must be a positive integer');
    }
    _store.teacherId = id;
  }
  
  export function setAnalysis(text) {
    if (typeof text !== 'string') {
      throw new Error('analysis must be a string');
    }
    _store.analysis = text;
  }
  
  export function setYear(text) {
    if (typeof text !== 'string') {
      throw new Error('year must be a string');
    }
    _store.year = text;
  }
  
  export function setThresholdA(value) {
    if (typeof value !== 'number') {
      throw new Error('thresholdA must be a number (float)');
    }
    _store.thresholdA = value;
  }
  
  export function setThresholdB(value) {
    if (typeof value !== 'number') {
      throw new Error('thresholdB must be a number (float)');
    }
    _store.thresholdB = value;
  }
  
  export function setThresholdC(value) {
    if (typeof value !== 'number') {
      throw new Error('thresholdC must be a number (float)');
    }
    _store.thresholdC = value;
  }

  export function setThresholdX(value) {
    if (typeof value !== 'number') {
      throw new Error('thresholdX must be a number (float)');
    }
    _store.thresholdX = value;
  }
  
  export function setThresholdY(value) {
    if (typeof value !== 'number') {
      throw new Error('thresholdY must be a number (float)');
    }
    _store.thresholdY = value;
  }
  
  export function setThresholdZ(value) {
    if (typeof value !== 'number') {
      throw new Error('thresholdZ must be a number (float)');
    }
    _store.thresholdZ = value;
  }
  
  export function setTypeAnalyze(letter) {
    if (typeof letter !== 'string') {
      throw new Error('typeAnalyze must be a string');
    }
    _store.typeAnalyze = letter;
  }

  // ——— Утилита ———
  export function getAll() {
    return { ..._store };
  }
  