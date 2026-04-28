'use strict';

var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
var configResolver = require('@smithy/config-resolver');
var core = require('@smithy/core');
var schema = require('@smithy/core/schema');
var middlewareContentLength = require('@smithy/middleware-content-length');
var middlewareEndpoint = require('@smithy/middleware-endpoint');
var middlewareRetry = require('@smithy/middleware-retry');
var smithyClient = require('@smithy/smithy-client');
var httpAuthSchemeProvider = require('./auth/httpAuthSchemeProvider');
var runtimeConfig = require('./runtimeConfig');
var regionConfigResolver = require('@aws-sdk/region-config-resolver');
var protocolHttp = require('@smithy/protocol-http');
var schemas_0 = require('./schemas/schemas_0');
var errors = require('./models/errors');
var TextractServiceException = require('./models/TextractServiceException');

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "textract",
    });
};
const commonParams = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
};

const getHttpAuthExtensionConfiguration = (runtimeConfig) => {
    const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
    let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
    let _credentials = runtimeConfig.credentials;
    return {
        setHttpAuthScheme(httpAuthScheme) {
            const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
            if (index === -1) {
                _httpAuthSchemes.push(httpAuthScheme);
            }
            else {
                _httpAuthSchemes.splice(index, 1, httpAuthScheme);
            }
        },
        httpAuthSchemes() {
            return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
            _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
            return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
            _credentials = credentials;
        },
        credentials() {
            return _credentials;
        },
    };
};
const resolveHttpAuthRuntimeConfig = (config) => {
    return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials(),
    };
};

const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    const extensionConfiguration = Object.assign(regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig), smithyClient.getDefaultExtensionConfiguration(runtimeConfig), protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(runtimeConfig, regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration), smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration), protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};

class TextractClient extends smithyClient.Client {
    config;
    constructor(...[configuration]) {
        const _config_0 = runtimeConfig.getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = middlewareUserAgent.resolveUserAgentConfig(_config_1);
        const _config_3 = middlewareRetry.resolveRetryConfig(_config_2);
        const _config_4 = configResolver.resolveRegionConfig(_config_3);
        const _config_5 = middlewareHostHeader.resolveHostHeaderConfig(_config_4);
        const _config_6 = middlewareEndpoint.resolveEndpointConfig(_config_5);
        const _config_7 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_6);
        const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultTextractHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
            }),
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

class AnalyzeDocumentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "AnalyzeDocument", {})
    .n("TextractClient", "AnalyzeDocumentCommand")
    .sc(schemas_0.AnalyzeDocument$)
    .build() {
}

class AnalyzeExpenseCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "AnalyzeExpense", {})
    .n("TextractClient", "AnalyzeExpenseCommand")
    .sc(schemas_0.AnalyzeExpense$)
    .build() {
}

class AnalyzeIDCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "AnalyzeID", {})
    .n("TextractClient", "AnalyzeIDCommand")
    .sc(schemas_0.AnalyzeID$)
    .build() {
}

class CreateAdapterCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "CreateAdapter", {})
    .n("TextractClient", "CreateAdapterCommand")
    .sc(schemas_0.CreateAdapter$)
    .build() {
}

class CreateAdapterVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "CreateAdapterVersion", {})
    .n("TextractClient", "CreateAdapterVersionCommand")
    .sc(schemas_0.CreateAdapterVersion$)
    .build() {
}

class DeleteAdapterCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "DeleteAdapter", {})
    .n("TextractClient", "DeleteAdapterCommand")
    .sc(schemas_0.DeleteAdapter$)
    .build() {
}

class DeleteAdapterVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "DeleteAdapterVersion", {})
    .n("TextractClient", "DeleteAdapterVersionCommand")
    .sc(schemas_0.DeleteAdapterVersion$)
    .build() {
}

class DetectDocumentTextCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "DetectDocumentText", {})
    .n("TextractClient", "DetectDocumentTextCommand")
    .sc(schemas_0.DetectDocumentText$)
    .build() {
}

class GetAdapterCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "GetAdapter", {})
    .n("TextractClient", "GetAdapterCommand")
    .sc(schemas_0.GetAdapter$)
    .build() {
}

class GetAdapterVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "GetAdapterVersion", {})
    .n("TextractClient", "GetAdapterVersionCommand")
    .sc(schemas_0.GetAdapterVersion$)
    .build() {
}

class GetDocumentAnalysisCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "GetDocumentAnalysis", {})
    .n("TextractClient", "GetDocumentAnalysisCommand")
    .sc(schemas_0.GetDocumentAnalysis$)
    .build() {
}

class GetDocumentTextDetectionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "GetDocumentTextDetection", {})
    .n("TextractClient", "GetDocumentTextDetectionCommand")
    .sc(schemas_0.GetDocumentTextDetection$)
    .build() {
}

class GetExpenseAnalysisCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "GetExpenseAnalysis", {})
    .n("TextractClient", "GetExpenseAnalysisCommand")
    .sc(schemas_0.GetExpenseAnalysis$)
    .build() {
}

class GetLendingAnalysisCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "GetLendingAnalysis", {})
    .n("TextractClient", "GetLendingAnalysisCommand")
    .sc(schemas_0.GetLendingAnalysis$)
    .build() {
}

class GetLendingAnalysisSummaryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "GetLendingAnalysisSummary", {})
    .n("TextractClient", "GetLendingAnalysisSummaryCommand")
    .sc(schemas_0.GetLendingAnalysisSummary$)
    .build() {
}

class ListAdaptersCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "ListAdapters", {})
    .n("TextractClient", "ListAdaptersCommand")
    .sc(schemas_0.ListAdapters$)
    .build() {
}

class ListAdapterVersionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "ListAdapterVersions", {})
    .n("TextractClient", "ListAdapterVersionsCommand")
    .sc(schemas_0.ListAdapterVersions$)
    .build() {
}

class ListTagsForResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "ListTagsForResource", {})
    .n("TextractClient", "ListTagsForResourceCommand")
    .sc(schemas_0.ListTagsForResource$)
    .build() {
}

class StartDocumentAnalysisCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "StartDocumentAnalysis", {})
    .n("TextractClient", "StartDocumentAnalysisCommand")
    .sc(schemas_0.StartDocumentAnalysis$)
    .build() {
}

class StartDocumentTextDetectionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "StartDocumentTextDetection", {})
    .n("TextractClient", "StartDocumentTextDetectionCommand")
    .sc(schemas_0.StartDocumentTextDetection$)
    .build() {
}

class StartExpenseAnalysisCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "StartExpenseAnalysis", {})
    .n("TextractClient", "StartExpenseAnalysisCommand")
    .sc(schemas_0.StartExpenseAnalysis$)
    .build() {
}

class StartLendingAnalysisCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "StartLendingAnalysis", {})
    .n("TextractClient", "StartLendingAnalysisCommand")
    .sc(schemas_0.StartLendingAnalysis$)
    .build() {
}

class TagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "TagResource", {})
    .n("TextractClient", "TagResourceCommand")
    .sc(schemas_0.TagResource$)
    .build() {
}

class UntagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "UntagResource", {})
    .n("TextractClient", "UntagResourceCommand")
    .sc(schemas_0.UntagResource$)
    .build() {
}

class UpdateAdapterCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("Textract", "UpdateAdapter", {})
    .n("TextractClient", "UpdateAdapterCommand")
    .sc(schemas_0.UpdateAdapter$)
    .build() {
}

const paginateListAdapters = core.createPaginator(TextractClient, ListAdaptersCommand, "NextToken", "NextToken", "MaxResults");

const paginateListAdapterVersions = core.createPaginator(TextractClient, ListAdapterVersionsCommand, "NextToken", "NextToken", "MaxResults");

const commands = {
    AnalyzeDocumentCommand,
    AnalyzeExpenseCommand,
    AnalyzeIDCommand,
    CreateAdapterCommand,
    CreateAdapterVersionCommand,
    DeleteAdapterCommand,
    DeleteAdapterVersionCommand,
    DetectDocumentTextCommand,
    GetAdapterCommand,
    GetAdapterVersionCommand,
    GetDocumentAnalysisCommand,
    GetDocumentTextDetectionCommand,
    GetExpenseAnalysisCommand,
    GetLendingAnalysisCommand,
    GetLendingAnalysisSummaryCommand,
    ListAdaptersCommand,
    ListAdapterVersionsCommand,
    ListTagsForResourceCommand,
    StartDocumentAnalysisCommand,
    StartDocumentTextDetectionCommand,
    StartExpenseAnalysisCommand,
    StartLendingAnalysisCommand,
    TagResourceCommand,
    UntagResourceCommand,
    UpdateAdapterCommand,
};
const paginators = {
    paginateListAdapters,
    paginateListAdapterVersions,
};
class Textract extends TextractClient {
}
smithyClient.createAggregatedClient(commands, Textract, { paginators });

const FeatureType = {
    FORMS: "FORMS",
    LAYOUT: "LAYOUT",
    QUERIES: "QUERIES",
    SIGNATURES: "SIGNATURES",
    TABLES: "TABLES",
};
const AdapterVersionStatus = {
    ACTIVE: "ACTIVE",
    AT_RISK: "AT_RISK",
    CREATION_ERROR: "CREATION_ERROR",
    CREATION_IN_PROGRESS: "CREATION_IN_PROGRESS",
    DEPRECATED: "DEPRECATED",
};
const ContentClassifier = {
    FREE_OF_ADULT_CONTENT: "FreeOfAdultContent",
    FREE_OF_PERSONALLY_IDENTIFIABLE_INFORMATION: "FreeOfPersonallyIdentifiableInformation",
};
const BlockType = {
    CELL: "CELL",
    KEY_VALUE_SET: "KEY_VALUE_SET",
    LAYOUT_FIGURE: "LAYOUT_FIGURE",
    LAYOUT_FOOTER: "LAYOUT_FOOTER",
    LAYOUT_HEADER: "LAYOUT_HEADER",
    LAYOUT_KEY_VALUE: "LAYOUT_KEY_VALUE",
    LAYOUT_LIST: "LAYOUT_LIST",
    LAYOUT_PAGE_NUMBER: "LAYOUT_PAGE_NUMBER",
    LAYOUT_SECTION_HEADER: "LAYOUT_SECTION_HEADER",
    LAYOUT_TABLE: "LAYOUT_TABLE",
    LAYOUT_TEXT: "LAYOUT_TEXT",
    LAYOUT_TITLE: "LAYOUT_TITLE",
    LINE: "LINE",
    MERGED_CELL: "MERGED_CELL",
    PAGE: "PAGE",
    QUERY: "QUERY",
    QUERY_RESULT: "QUERY_RESULT",
    SELECTION_ELEMENT: "SELECTION_ELEMENT",
    SIGNATURE: "SIGNATURE",
    TABLE: "TABLE",
    TABLE_FOOTER: "TABLE_FOOTER",
    TABLE_TITLE: "TABLE_TITLE",
    TITLE: "TITLE",
    WORD: "WORD",
};
const EntityType = {
    COLUMN_HEADER: "COLUMN_HEADER",
    KEY: "KEY",
    SEMI_STRUCTURED_TABLE: "SEMI_STRUCTURED_TABLE",
    STRUCTURED_TABLE: "STRUCTURED_TABLE",
    TABLE_FOOTER: "TABLE_FOOTER",
    TABLE_SECTION_TITLE: "TABLE_SECTION_TITLE",
    TABLE_SUMMARY: "TABLE_SUMMARY",
    TABLE_TITLE: "TABLE_TITLE",
    VALUE: "VALUE",
};
const RelationshipType = {
    ANSWER: "ANSWER",
    CHILD: "CHILD",
    COMPLEX_FEATURES: "COMPLEX_FEATURES",
    MERGED_CELL: "MERGED_CELL",
    TABLE: "TABLE",
    TABLE_FOOTER: "TABLE_FOOTER",
    TABLE_TITLE: "TABLE_TITLE",
    TITLE: "TITLE",
    VALUE: "VALUE",
};
const SelectionStatus = {
    NOT_SELECTED: "NOT_SELECTED",
    SELECTED: "SELECTED",
};
const TextType = {
    HANDWRITING: "HANDWRITING",
    PRINTED: "PRINTED",
};
const ValueType = {
    DATE: "DATE",
};
const AutoUpdate = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
const JobStatus = {
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
    PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
    SUCCEEDED: "SUCCEEDED",
};

exports.$Command = smithyClient.Command;
exports.__Client = smithyClient.Client;
exports.TextractServiceException = TextractServiceException.TextractServiceException;
exports.AdapterVersionStatus = AdapterVersionStatus;
exports.AnalyzeDocumentCommand = AnalyzeDocumentCommand;
exports.AnalyzeExpenseCommand = AnalyzeExpenseCommand;
exports.AnalyzeIDCommand = AnalyzeIDCommand;
exports.AutoUpdate = AutoUpdate;
exports.BlockType = BlockType;
exports.ContentClassifier = ContentClassifier;
exports.CreateAdapterCommand = CreateAdapterCommand;
exports.CreateAdapterVersionCommand = CreateAdapterVersionCommand;
exports.DeleteAdapterCommand = DeleteAdapterCommand;
exports.DeleteAdapterVersionCommand = DeleteAdapterVersionCommand;
exports.DetectDocumentTextCommand = DetectDocumentTextCommand;
exports.EntityType = EntityType;
exports.FeatureType = FeatureType;
exports.GetAdapterCommand = GetAdapterCommand;
exports.GetAdapterVersionCommand = GetAdapterVersionCommand;
exports.GetDocumentAnalysisCommand = GetDocumentAnalysisCommand;
exports.GetDocumentTextDetectionCommand = GetDocumentTextDetectionCommand;
exports.GetExpenseAnalysisCommand = GetExpenseAnalysisCommand;
exports.GetLendingAnalysisCommand = GetLendingAnalysisCommand;
exports.GetLendingAnalysisSummaryCommand = GetLendingAnalysisSummaryCommand;
exports.JobStatus = JobStatus;
exports.ListAdapterVersionsCommand = ListAdapterVersionsCommand;
exports.ListAdaptersCommand = ListAdaptersCommand;
exports.ListTagsForResourceCommand = ListTagsForResourceCommand;
exports.RelationshipType = RelationshipType;
exports.SelectionStatus = SelectionStatus;
exports.StartDocumentAnalysisCommand = StartDocumentAnalysisCommand;
exports.StartDocumentTextDetectionCommand = StartDocumentTextDetectionCommand;
exports.StartExpenseAnalysisCommand = StartExpenseAnalysisCommand;
exports.StartLendingAnalysisCommand = StartLendingAnalysisCommand;
exports.TagResourceCommand = TagResourceCommand;
exports.TextType = TextType;
exports.Textract = Textract;
exports.TextractClient = TextractClient;
exports.UntagResourceCommand = UntagResourceCommand;
exports.UpdateAdapterCommand = UpdateAdapterCommand;
exports.ValueType = ValueType;
exports.paginateListAdapterVersions = paginateListAdapterVersions;
exports.paginateListAdapters = paginateListAdapters;
Object.prototype.hasOwnProperty.call(schemas_0, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: schemas_0['__proto__']
    });

Object.keys(schemas_0).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = schemas_0[k];
});
Object.prototype.hasOwnProperty.call(errors, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: errors['__proto__']
    });

Object.keys(errors).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = errors[k];
});
