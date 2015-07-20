
    function addDOMChart(waveformId, chartId)
    {
        //$('#' + waveformId).add('<div id="' + chartId + '"></div>');
        document.getElementById(waveformId).innerHTML += ('<div id="' + chartId + '"></div>');
//        console.log("addDOMChart");
    }

    function bindChart(chartId, channelData, yAxis) {
//        console.log(yAxis);

        var samples = channelData.samples;
        var codeMeaning = channelData.channelDefinition.channelSource.codeMeaning;

//        var yMax = 1500;
//        var yMin = -500;
//        var yMax = 2.0;
//        var yMin = -0.4;

//        var deltaYSecondary = 100;
//        var deltaYMain = 500;

        var xMin = 0;
        var xMax = samples.length;
        var deltaX = 40;
        var deltaX2 = 200;


        var params = {
            bindto: '#' + chartId,
            data: {
              columns: [[codeMeaning]]
            },
            point: {
                show: false
            },
            transition: {
                duration: 0
            },
            axis: {
                x: {
                    tick: {
                        count: 1
                    }
                },
                y: {
                    max: yAxis.max,
                    min: yAxis.min,
                    label: {
                        text: yAxis.label,
                        position: 'outer-middle'
                    },
                    tick: {
                        values: []
                    }
                }
            },
            grid: {
                // 40(200) ms, 40(200) uV ?
                x: {
                    lines:[]
                },
                y: {
                    lines:[]
                }

            }
        };

        params.data.columns[0] = params.data.columns[0].concat(samples);


        for (var y = yAxis.min; y <= yAxis.max; y += yAxis.deltaSecondary) {
            params.grid.y.lines.push({value: y});
        }

        for (var y = yAxis.min; y <= yAxis.max; y += yAxis.deltaMain) {
            params.grid.y.lines.push({value: y});
            params.axis.y.tick.values.push(y);
        }

        for (var x = xMin; x <= xMax; x += deltaX) {
            params.grid.x.lines.push({value: x});
        }

        for (var x = xMin; x <= xMax; x += deltaX2) {
            params.grid.x.lines.push({value: x});
        }

//        console.log(params);

        var chart = c3.generate(params);
        console.log('bindChart end');
    }


    /**
     * Helper function to read sequences of coded elements, like:
     * - Channel Source Sequence (003A,0208)
     * - Channel Sensitivity Units Sequence (003A,0211)
     */
    function readCodeSequence(codeSequence) {
        var code = {};
        if (codeSequence !== undefined) {
            if (codeSequence.items.length > 0) { 
                var codeDataset = codeSequence.items[0].dataSet;
                // console.log(codeDataset);
                code.codeValue = codeDataset.string('x00080100'); // VR = SH
                code.codingSchemeDesignator = codeDataset.string('x00080102'); // VR = SH
                code.codingSchemeVersion = codeDataset.string('x00080103'); // VR = SH
                code.codeMeaning = codeDataset.string('x00080104'); // VR = LO
            }
        }
        return code;
    }


    function createInstanceObject(dataSet, imageId)
    {

        // make the image based on whether it is color or not
        var sopClassUID = dataSet.string('x00080016');

        switch (sopClassUID) {

            case '1.2.840.10008.5.1.4.1.1.9.1.1': // 12-lead ECG Waveform Storage
            case '1.2.840.10008.5.1.4.1.1.9.1.2': // General ECG Waveform Storage
            case '1.2.840.10008.5.1.4.1.1.9.2.1': // Hemodynamic Waveform Storage
                console.log("SOP Class UID: " + sopClassUID);

                // Structure: Waveform - Multiplex - channel - sample

                var waveform = {};

                var channelSourceSequence = dataSet.elements.x003a0208;
                if(channelSourceSequence !== undefined) {
                    console.log("Channel Source Sequence is present");
                    if (channelSourceSequence.items.length > 0) {
                        console.log(channelSourceSequence);
                    }
                }


                var waveformSequence = dataSet.elements.x54000100;
                if(waveformSequence !== undefined) {
                    console.log("Waveform data is present");
                    if (waveformSequence.items.length > 0) {
                        // var multiplex;
                        waveform.multiplexGroup = {};

                        waveformSequence.items.forEach(function (item) {
                            console.log('Item tag: ' + item.tag);
                            if (item.tag == 'xfffee000') // item start tag
                            {
                                // console.log(item);
                                var multiplexGroup = item.dataSet;
                                var mg = {}; // multiplexGroup
                                // console.log(multiplexGroup);

                                mg.waveformOriginality = multiplexGroup.string('x003a0004'); // VR = CS
                                mg.numberOfWaveformChannels = multiplexGroup.uint16('x003a0005'); // VR = US
                                mg.numberOfWaveformSamples = multiplexGroup.uint32('x003a0010'); // VR = UL
                                mg.samplingFrequency = multiplexGroup.floatString('x003a001a'); // VR = DS
                                mg.multiplexGroupLabel = multiplexGroup.string('x003a0020'); // VR = SH

                                // Initialization of channels
                                mg.channels = [];
                                for(var numChannel = 0; numChannel < mg.numberOfWaveformChannels; numChannel++ ) {
                                    // console.log(numChannel);
                                    var chartId = 'myChart_' + numChannel;
                                    addDOMChart('myWaveform', chartId);
                                }


                                channelDefinitionSequence = multiplexGroup.elements.x003a0200;
                                // console.log(channelDefinitionSequence);
                                var numDefinition = 0;
                                if (channelDefinitionSequence !== undefined) {
                                    if (channelDefinitionSequence.items.length > 0) {
                                        channelDefinitionSequence.items.forEach(function (item) {
                                            if (item.tag == 'xfffee000') // item start tag
                                            {
                                                // console.log("numDefinition: " + numDefinition);
                                                var channelDefinition = item.dataSet;
                                                var cd = {}; // channelDefinition
                                                // console.log(channelDefinition);

                                                cd.channelSource = readCodeSequence(channelDefinition.elements.x003a0208);

                                                // http://stackoverflow.com/questions/12855400/rchannel-sensitivity-in-dicom-waveforms
                                                cd.channelSensitivity = channelDefinition.string('x003a0210'); // VR = DS
                                                cd.channelSensitivityUnits = readCodeSequence(channelDefinition.elements.x003a0211);
                                                cd.channelSensitivityCorrectionFactor = channelDefinition.string('x003a0212'); // VR = DS
                                                cd.channelBaseline = channelDefinition.string('x003a0213'); // VR = DS
                                                // cd.channelTimeSkew = channelDefinition.string('x003a0214'); // VR = DS
                                                // cd.channelSampleSkew = channelDefinition.string('x003a0215'); // VR = DS
                                                cd.waveformBitsStored = channelDefinition.uint16('x003a021a'); // VR = US
                                                // cd.filterLowFrequency = channelDefinition.string('x003a0220'); // VR = DS
                                                // cd.filterHighFrequency = channelDefinition.string('x003a0221'); // VR = DS

                                                mg.channels[numDefinition] = {};
                                                mg.channels[numDefinition].channelDefinition = cd;
                                                mg.channels[numDefinition].samples = [];

                                                numDefinition++;
                                            }
                                        });
                                    }

                                }
                                console.log(mg);


                                mg.waveformBitsAllocated = multiplexGroup.uint16('x54001004'); // VR = US
                                mg.waveformSampleInterpretation = multiplexGroup.string('x54001006'); // VR = CS
                                switch (mg.waveformBitsAllocated) {
                                    case 8:
                                        switch (mg.waveformSampleInterpretation) {
                                            case 'SB': // signed 8 bit linear
                                            case 'UB': // unsigned 8 bit linear
                                            case 'MB': // 8 bit mu-law (in accordance with ITU-T Recommendation G.711)
                                            case 'AB': // 8 bit A-law (in accordance with ITU-T Recommendation G.711)
                                            default:
                                                var waveformPaddingValue = multiplexGroup.string('x5400100a'); // VR = OB
                                                var waveformData = multiplexGroup.string('x54001010'); // VR = OB or OW (OB)
                                        }
                                    break;

                                    case 16:
                                        switch (mg.waveformSampleInterpretation) {
                                            case 'SS': // signed 16 bit linear
                                                var waveformPaddingValue = multiplexGroup.int16('x5400100a'); // VR = OB or OW (OW->SS)
                                                var waveformData = multiplexGroup.string('x54001010'); // VR = OB or OW
                                                var sampleOffset = multiplexGroup.elements.x54001010.dataOffset;
//                                                var sampleSize = multiplexGroup.elements.x54001010.length / 2; // 16 bit!
                                                var sampleSize = mg.numberOfWaveformSamples * mg.numberOfWaveformChannels;
                                                console.log('sampleOffset: ' + sampleOffset + ', sampleSize: ' + sampleSize);
                                                var sampleData = new Int16Array(dataSet.byteArray.buffer, sampleOffset, sampleSize);

                                                var pos = 0;

                                                // 10 mm/mV is a rather standard value for ECG

                                                for(var numSample = 0; numSample < mg.numberOfWaveformSamples; numSample++ ) {
                                                    for(var numChannel = 0; numChannel < mg.numberOfWaveformChannels; numChannel++ ) {
                                                        // mg.channels[numChannel].samples.push(sampleData[pos] * mg.channels[numChannel].channelDefinition.channelSensitivity);
                                                        mg.channels[numChannel].samples.push(sampleData[pos]);
                                                        pos++;
                                                        // sample = dataSet.byteArray, offset, ...

                                                    }
                                                }
                                                console.log("Multiplex samples have been read");



                                            break;

                                            case 'US': // unsigned 16 bit linear
                                                var waveformPaddingValue = multiplexGroup.uint16('x5400100a'); // VR = OB or OW (OW->US)
                                                var waveformData = multiplexGroup.string('x54001010'); // VR = OB or OW
                                            break;

                                            default:
                                              console.log(waveformSampleInterpretation);
                                            // throw
                                        }

                                    break;

                                    default:
//                                     throw
                                };




                                console.log("waveformBitsAllocated: " + mg.waveformBitsAllocated);
                                console.log("waveformSampleInterpretation: " + mg.waveformSampleInterpretation);
                                console.log("waveformPaddingValue: " + waveformPaddingValue); // ToDo...

/*
Channel Sensitivity: Nominal numeric value of unit quantity of sample. Required if samples represent defined (not arbitrary) units.
Channel Sensitivity Units Sequence: A coded descriptor of the Units of measure for the Channel Sensitivity.
Channel Sensitivity Correction Factor: Multiplier to be applied to encoded sample values to match units specified in Channel Sensitivity
Channel Baseline: Offset of encoded sample value 0 from actual 0 using the units defined in the Channel Sensitivity Units Sequence
*/
                                var adjValue;
                                for(var numChannel = 0; numChannel < mg.numberOfWaveformChannels; numChannel++ ) {
                                    var channel = mg.channels[numChannel];
                                    var baseline = Number(channel.channelDefinition.channelBaseline);
                                    var sensitivity = Number(channel.channelDefinition.channelSensitivity);
                                    var sensitivityCorrectionFactor = Number(channel.channelDefinition.channelSensitivityCorrectionFactor);
                                    
                                    // ATM: Units hardcoded as uV. ToDo: Change this!
                                    // var units = channel.channelDefinition.channelSensitivityUnits.codeValue;

                                    for(var numSample = 0; numSample < mg.numberOfWaveformSamples; numSample++ ) {
                                        adjValue = baseline + channel.samples[numSample] * sensitivity * sensitivityCorrectionFactor;
                                        channel.samples[numSample] = adjValue;
                                    }
                                }


// *** ToDo:
// Automatic selection of units range depending on max / min values ??''
// Automatic selection depending on SOP Class UID ?
                                for(var numChannel = 0; numChannel < mg.numberOfWaveformChannels; numChannel++ ) {
                                    var chartId = 'myChart_' + numChannel;
                                    var yAxis = {};
                                    
                                    switch (mg.channels[numChannel].channelDefinition.channelSensitivityUnits.codeValue) {
                                        case 'uV':
                                            yAxis.min = -500;
                                            yAxis.max = 1500;
                                            yAxis.deltaMain = 500;
                                            yAxis.deltaSecondary = 100;
                                        break;

                                        case 'mV':
                                        // *** ToDo: proper rounding of values in y axis
                                            yAxis.min = -0.5;
                                            yAxis.max = 1.5;
                                            yAxis.deltaMain = 0.5;
                                            yAxis.deltaSecondary = 0.1;
                                        break;

                                        case 'mm[Hg]': // Better 60 ~ 160 range ?
                                            yAxis.min = 0;
                                            yAxis.max = 200;
                                            yAxis.deltaMain = 100;
                                            yAxis.deltaSecondary = 20;
                                        break;

                                        default:
                                            yAxis.min = -500;
                                            yAxis.max = 1500;
                                            yAxis.deltaMain = 500;
                                            yAxis.deltaSecondary = 100;
                                    };
                                    

                                    yAxis.label = mg.channels[numChannel].channelDefinition.channelSensitivityUnits.codeMeaning + ' (' + 
                                          mg.channels[numChannel].channelDefinition.channelSensitivityUnits.codeValue + ')';
                                    bindChart(chartId, mg.channels[numChannel], yAxis);
                                }
                                

                            }
                        });
                   
                    }
                }

            break;

            default:
                console.log("Unsupported SOP Class UID: " + sopClassUID);
        }

    }


    // based on https://github.com/chafey/cornerstone/wiki/ImageLoader
    function loadInstance(imageId) {
        // create a deferred object
//        var deferred = $.Deferred();

        // Make the request for the DICOM data
        var oReq = new XMLHttpRequest();
        oReq.open("get", imageId, true);
        oReq.responseType = "arraybuffer";
        oReq.onreadystatechange = function(oEvent) {
            if (oReq.readyState === 4)
            {
                if (oReq.status == 200) {

                    var dicomPart10AsArrayBuffer = oReq.response;
                    var byteArray = new Uint8Array(dicomPart10AsArrayBuffer);
                    var dataSet = dicomParser.parseDicom(byteArray);

                    var instancePromise = createInstanceObject(dataSet, imageId);
/*                    
                    instancePromise.then(function(instance) {
                        deferred.resolve(instance);
                    }, function() {
                        deferred.reject();
                    });
*/                    
                }
                else {
                    // an error occurred, return an object describing the error by rejecting
                    // the deferred
//                    deferred.reject({error: oReq.statusText});
                }
            }
        };
        oReq.send();

        // return the pending deferred object to cornerstone so it can setup callbacks to be 
        // invoked asynchronously for the success/resolve and failure/reject scenarios.
//        return deferred;
    }
