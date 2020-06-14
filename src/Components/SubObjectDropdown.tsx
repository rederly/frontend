import React from 'react';
import { NavDropdown } from 'react-bootstrap';
import _ from 'lodash';

interface SubObjectDropdownProps {
    eventKeyState: string;
    title: string;
    subObjArray: Array<any>;
    style?: any;
    eventKey: string;
}

/**
 * This Dropdown button renders a dynamic list of selectable subobject names.
 * Intended use case: List of 
 */
export const SubObjectDropdown: React.FC<SubObjectDropdownProps> = ({eventKeyState, title, eventKey, subObjArray, style}) => {
    return (
        <NavDropdown title={title} id={`${eventKey}-dropdown`} active={_.startsWith(eventKeyState, eventKey)} style={style} drop='right'>
            {subObjArray.map(obj => (
                <NavDropdown.Item key={obj.id} eventKey={`${eventKey}-${obj.id}`}>{obj.name}</NavDropdown.Item>
            ))}
        </NavDropdown>
    );
};

export default SubObjectDropdown;