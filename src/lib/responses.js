class BaseSuccessResponseDto {
  constructor(data, responseType = 'json') {
    this.success = true;
    this.responseType = responseType;
    this.data = data;
  }
}

class BaseErrorResponseDto {
  constructor(message, code = 500, details = null) {
    this.success = false;
    this.error = {
      code,
      message,
      details
    };
  }
}

class TextResponseData {
  constructor(text) {
    this.text = text;
  }
}

class JsonResponseData {
  constructor(data) {
    Object.assign(this, data);
  }
}

module.exports = {
  BaseSuccessResponseDto,
  BaseErrorResponseDto,
  TextResponseData,
  JsonResponseData
};