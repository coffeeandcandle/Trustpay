"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidJobIdException = exports.ResourceNotFoundException = exports.InvalidKMSKeyException = exports.ValidationException = exports.ServiceQuotaExceededException = exports.LimitExceededException = exports.IdempotentParameterMismatchException = exports.ConflictException = exports.UnsupportedDocumentException = exports.ThrottlingException = exports.ProvisionedThroughputExceededException = exports.InvalidS3ObjectException = exports.InvalidParameterException = exports.InternalServerError = exports.HumanLoopQuotaExceededException = exports.DocumentTooLargeException = exports.BadDocumentException = exports.AccessDeniedException = void 0;
const TextractServiceException_1 = require("./TextractServiceException");
class AccessDeniedException extends TextractServiceException_1.TextractServiceException {
    name = "AccessDeniedException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "AccessDeniedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccessDeniedException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.AccessDeniedException = AccessDeniedException;
class BadDocumentException extends TextractServiceException_1.TextractServiceException {
    name = "BadDocumentException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "BadDocumentException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, BadDocumentException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.BadDocumentException = BadDocumentException;
class DocumentTooLargeException extends TextractServiceException_1.TextractServiceException {
    name = "DocumentTooLargeException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "DocumentTooLargeException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, DocumentTooLargeException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.DocumentTooLargeException = DocumentTooLargeException;
class HumanLoopQuotaExceededException extends TextractServiceException_1.TextractServiceException {
    name = "HumanLoopQuotaExceededException";
    $fault = "client";
    ResourceType;
    QuotaCode;
    ServiceCode;
    Message;
    Code;
    constructor(opts) {
        super({
            name: "HumanLoopQuotaExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, HumanLoopQuotaExceededException.prototype);
        this.ResourceType = opts.ResourceType;
        this.QuotaCode = opts.QuotaCode;
        this.ServiceCode = opts.ServiceCode;
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.HumanLoopQuotaExceededException = HumanLoopQuotaExceededException;
class InternalServerError extends TextractServiceException_1.TextractServiceException {
    name = "InternalServerError";
    $fault = "server";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "InternalServerError",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServerError.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.InternalServerError = InternalServerError;
class InvalidParameterException extends TextractServiceException_1.TextractServiceException {
    name = "InvalidParameterException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "InvalidParameterException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidParameterException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.InvalidParameterException = InvalidParameterException;
class InvalidS3ObjectException extends TextractServiceException_1.TextractServiceException {
    name = "InvalidS3ObjectException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "InvalidS3ObjectException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidS3ObjectException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.InvalidS3ObjectException = InvalidS3ObjectException;
class ProvisionedThroughputExceededException extends TextractServiceException_1.TextractServiceException {
    name = "ProvisionedThroughputExceededException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "ProvisionedThroughputExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ProvisionedThroughputExceededException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.ProvisionedThroughputExceededException = ProvisionedThroughputExceededException;
class ThrottlingException extends TextractServiceException_1.TextractServiceException {
    name = "ThrottlingException";
    $fault = "server";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "ThrottlingException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, ThrottlingException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.ThrottlingException = ThrottlingException;
class UnsupportedDocumentException extends TextractServiceException_1.TextractServiceException {
    name = "UnsupportedDocumentException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "UnsupportedDocumentException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, UnsupportedDocumentException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.UnsupportedDocumentException = UnsupportedDocumentException;
class ConflictException extends TextractServiceException_1.TextractServiceException {
    name = "ConflictException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "ConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConflictException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.ConflictException = ConflictException;
class IdempotentParameterMismatchException extends TextractServiceException_1.TextractServiceException {
    name = "IdempotentParameterMismatchException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "IdempotentParameterMismatchException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, IdempotentParameterMismatchException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.IdempotentParameterMismatchException = IdempotentParameterMismatchException;
class LimitExceededException extends TextractServiceException_1.TextractServiceException {
    name = "LimitExceededException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "LimitExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, LimitExceededException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.LimitExceededException = LimitExceededException;
class ServiceQuotaExceededException extends TextractServiceException_1.TextractServiceException {
    name = "ServiceQuotaExceededException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "ServiceQuotaExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ServiceQuotaExceededException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.ServiceQuotaExceededException = ServiceQuotaExceededException;
class ValidationException extends TextractServiceException_1.TextractServiceException {
    name = "ValidationException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "ValidationException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ValidationException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.ValidationException = ValidationException;
class InvalidKMSKeyException extends TextractServiceException_1.TextractServiceException {
    name = "InvalidKMSKeyException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "InvalidKMSKeyException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidKMSKeyException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.InvalidKMSKeyException = InvalidKMSKeyException;
class ResourceNotFoundException extends TextractServiceException_1.TextractServiceException {
    name = "ResourceNotFoundException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "ResourceNotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.ResourceNotFoundException = ResourceNotFoundException;
class InvalidJobIdException extends TextractServiceException_1.TextractServiceException {
    name = "InvalidJobIdException";
    $fault = "client";
    Message;
    Code;
    constructor(opts) {
        super({
            name: "InvalidJobIdException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidJobIdException.prototype);
        this.Message = opts.Message;
        this.Code = opts.Code;
    }
}
exports.InvalidJobIdException = InvalidJobIdException;
