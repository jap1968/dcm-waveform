
    function addDOMChart(waveformId, chartId)
    {
        //$('#' + waveformId).add('<div id="' + chartId + '"></div>');
        document.getElementById(waveformId).innerHTML += ('<div id="' + chartId + '"></div>');
//        console.log("addDOMChart");
    }

    function bindChart(chartId, channelData) {

        var samples = channelData.samples;
        var codeMeaning = channelData.channelDefinition.channelSource.codeMeaning;

        var yMax = 1200;
        var yMin = -400;
//        var yMax = 2.0;
//        var yMin = -0.4;

        var deltaY = 40;
        var deltaY2 = 200;

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
                    max: yMax,
                    min: yMin
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


        for (var y = yMin; y <= yMax; y += deltaY) {
            params.grid.y.lines.push({value: y});
        }

        for (var y = yMin; y <= yMax; y += deltaY2) {
            params.grid.y.lines.push({value: y});
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

/*     
                                console.log("waveformOriginality: " + mg.waveformOriginality);
                                console.log("numberOfWaveformChannels: " + mg.numberOfWaveformChannels);
                                console.log("numberOfWaveformSamples: " + mg.numberOfWaveformSamples);
                                console.log("samplingFrequency: " + mg.samplingFrequency);
                                console.log("multiplexGroupLabel: " + mg.multiplexGroupLabel);
*/
                                // Initialization of channels
                                mg.channels = [];
                                for(var numChannel = 0; numChannel < mg.numberOfWaveformChannels; numChannel++ ) {
                                    // console.log(numChannel);
//                                    mg.samples[numChannel] = [];
                                    var chartId = 'myChart_' + numChannel;
                                    addDOMChart('myWaveform', chartId);
                                }
                                // console.log(multiplexSamples);


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


                                                var channelSourceSequence = channelDefinition.elements.x003a0208;
                                                if (channelSourceSequence !== undefined) {
                                                    if (channelSourceSequence.items.length > 0) { 
                                                        var channelSource = channelSourceSequence.items[0].dataSet;
                                                        cd.channelSource = {};
                                                        // console.log(channelSource);
                                                        cd.channelSource.codeMeaning = channelSource.string('x00080104'); // VR = LO
                                                    }
                                                }

                                                // http://stackoverflow.com/questions/12855400/rchannel-sensitivity-in-dicom-waveforms
                                                cd.channelSensitivity = channelDefinition.string('x003a0210'); // VR = DS

                                                var channelSensitivityUnitsSequence = channelDefinition.elements.x003a0211;
                                                if (channelSensitivityUnitsSequence !== undefined) {
                                                    if (channelSensitivityUnitsSequence.items.length > 0) { 
                                                        var channelSensitivityUnits = channelSensitivityUnitsSequence.items[0].dataSet;
                                                        cd.channelSensitivityUnits = {};
                                                        cd.channelSensitivityUnits.codeMeaning = channelSensitivityUnits.string('x00080104'); // VR = LO
                                                    }
                                                }

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

/*
Channel Sensitivity: Nominal numeric value of unit quantity of sample. Required if samples represent defined (not arbitrary) units.
Channel Sensitivity Units Sequence: A coded descriptor of the Units of measure for the Channel Sensitivity.
Channel Sensitivity Correction Factor: Multiplier to be applied to encoded sample values to match units specified in Channel Sensitivity
Channel Baseline: Offset of encoded sample value 0 from actual 0 using the units defined in the Channel Sensitivity Units Sequence
*/
                                                for(var numSample = 0; numSample < mg.numberOfWaveformSamples; numSample++ ) {
                                                    for(var numChannel = 0; numChannel < mg.numberOfWaveformChannels; numChannel++ ) {
                                                        // mg.channels[numChannel].samples.push(sampleData[pos] * mg.channels[numChannel].channelDefinition.channelSensitivity);
                                                        mg.channels[numChannel].samples.push(sampleData[pos]);
                                                        pos++;
                                                        // sample = dataSet.byteArray, offset, ...

                                                    }
                                                }
                                                console.log("Multiplex samples have been read");




                                                for(var numChannel = 0; numChannel < mg.numberOfWaveformChannels; numChannel++ ) {
                                                    var chartId = 'myChart_' + numChannel;
                                                    // bindChart(chartId, multiplexSamples[numChannel]); // .slice(0, 4000)
                                                    bindChart(chartId, mg.channels[numChannel]);
                                                }

                                                //console.log(multiplexSamples);


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
                                

                            }
                        });
                   
                    }
                }

            break;

            default:
                console.log("Unsupported SOP Class UID: " + sopClassUID);
        }

    }

/*
    function makeWaveformPlot(imageId, dataSet, byteArray) {

        // extract the DICOM attributes we need
        var pixelSpacing = cornerstoneWADOImageLoader.getPixelSpacing(dataSet);
        var rows = dataSet.uint16('x00280010');
        var columns = dataSet.uint16('x00280011');
        var rescaleSlopeAndIntercept = cornerstoneWADOImageLoader.getRescaleSlopeAndIntercept(dataSet);
        var bytesPerPixel = getBytesPerPixel(dataSet);
        var numPixels = rows * columns;
        var sizeInBytes = numPixels * bytesPerPixel;
        var invert = (photometricInterpretation === "MONOCHROME1");
        var windowWidthAndCenter = cornerstoneWADOImageLoader.getWindowWidthAndCenter(dataSet);

        // Decompress and decode the pixel data for this image
        var storedPixelData = extractStoredPixels(dataSet, columns, rows, frame);
        var minMax = getMinMax(storedPixelData);

        function getPixelData() {
            return storedPixelData;
        }
    }
*/

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
