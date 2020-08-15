import React from 'react';
import _ from 'lodash';
import { ComponentToggleButton } from './ComponentToggleButton';
import { FaPencilAlt } from 'react-icons/fa';

interface EditToggleButtonProps {
    defaultSelectedState?: boolean;
    selectedState?: boolean;
    selectedStateJSX?: JSX.Element;
    notSelectedStateJSX?: JSX.Element;
    style?: React.CSSProperties;
    onClick?: (newState: boolean, oldState: boolean)=>void;
}

export const EditToggleButton: React.FC<EditToggleButtonProps> = ({
    defaultSelectedState,
    selectedState,
    style,
    onClick
}) => {
    return <ComponentToggleButton
        selectedStateJSX={ <FaPencilAlt color="#007bff" style={{float:'right'}} /> }
        notSelectedStateJSX={ <FaPencilAlt style={{float:'right'}} /> }
        defaultSelectedState={defaultSelectedState}
        selectedState={selectedState}
        style={style}
        onClick={onClick}
    />;
};